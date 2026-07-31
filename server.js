/**
 * BlockHost backend — server.js
 * Backend NYATA untuk menyalakan/mematikan server Minecraft Bedrock
 * (via PocketMine-MP) dari panel BlockHost, dijalankan di Termux (Android).
 *
 * Tidak butuh "npm install" — hanya pakai modul bawaan Node.js.
 * Jalankan dengan: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ====== KONFIGURASI ======
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PMMP_DIR = path.join(__dirname, 'pocketmine');
const PMMP_PHAR = path.join(PMMP_DIR, 'PocketMine-MP.phar');
const LOCAL_PHP_BIN = path.join(PMMP_DIR, 'php'); // dipakai kalau kamu taruh binary php di sini
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_DB_PATH = path.join(DATA_DIR, 'players.json'); // database pemain asli, persisten (bukan data dummy)
// ==========================

let proc = null;
let state = 'offline'; // offline | starting | online | stopping
let startTime = null;
let consoleBuf = [];   // { id, text }
let bufSeq = 0;
let players = new Set();          // nama pemain yang SEDANG online (real-time, dari parsing console)
let onlineSince = new Map();      // key(nama lower) -> timestamp join, untuk hitung waktu main asli
let lastCpuSample = null; // { utime, stime, t }
let stopKillTimer = null;

// ====== DATABASE PEMAIN ASLI (persisten di data/players.json) ======
function loadPlayerDB() {
  try {
    if (!fs.existsSync(PLAYERS_DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(PLAYERS_DB_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}
let playerDB = loadPlayerDB(); // key(nama lower) -> { name, firstSeen, lastJoin, lastLeave, totalPlaytimeSec }

let saveTimer = null;
function savePlayerDBSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(PLAYERS_DB_PATH, JSON.stringify(playerDB, null, 2));
    } catch (e) {
      pushLine('>> Gagal menyimpan database pemain: ' + e.message);
    }
  }, 500);
}

function onPlayerJoin(name) {
  const key = name.toLowerCase();
  const now = Date.now();
  onlineSince.set(key, now);
  if (!playerDB[key]) {
    playerDB[key] = { name, firstSeen: now, lastJoin: now, lastLeave: null, totalPlaytimeSec: 0 };
  } else {
    playerDB[key].name = name; // ikuti kapitalisasi terbaru
    playerDB[key].lastJoin = now;
  }
  savePlayerDBSoon();
}

function onPlayerLeave(name) {
  const key = name.toLowerCase();
  const joinedAt = onlineSince.get(key);
  if (joinedAt && playerDB[key]) {
    playerDB[key].totalPlaytimeSec += Math.max(0, Math.round((Date.now() - joinedAt) / 1000));
    playerDB[key].lastLeave = Date.now();
  }
  onlineSince.delete(key);
  savePlayerDBSoon();
}

// Kalau server berhenti/crash sebelum sempat kirim baris "left the game",
// tetap tutup sesi & catat waktu main asli supaya tidak hilang.
function flushAllOnlinePlayers() {
  for (const name of players) onPlayerLeave(name);
  players.clear();
}

function formatPlaytime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}j ${m}m`;
}

function isBanned(name) {
  try {
    const banFile = path.join(PMMP_DIR, 'banned-players.txt');
    if (!fs.existsSync(banFile)) return false;
    const raw = fs.readFileSync(banFile, 'utf8');
    const key = name.toLowerCase();
    return raw.split('\n').some((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return false;
      return t.split('|')[0].trim().toLowerCase() === key;
    });
  } catch (e) {
    return false;
  }
}

function pushLine(text) {
  bufSeq++;
  consoleBuf.push({ id: bufSeq, text });
  if (consoleBuf.length > 2000) consoleBuf.shift();
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r/g, '');
}

function phpBinary() {
  return fs.existsSync(LOCAL_PHP_BIN) ? LOCAL_PHP_BIN : 'php';
}

function handleChunk(raw) {
  raw.toString().split('\n').forEach((rawLine) => {
    if (!rawLine.trim()) return;
    const line = stripAnsi(rawLine);
    pushLine(line);

    // Deteksi server sudah siap menerima pemain
    if (/Done \(/i.test(line) || /Server started/i.test(line)) {
      state = 'online';
    }

    // Deteksi pemain masuk: "Nama[/1.2.3.4:port] logged in ..."
    let m = line.match(/^\[.*?\]\s*(?:\[.*?\]\s*)?([^\[\]]+?)\[\/[0-9.]+:\d+\] logged in/i);
    if (m) {
      const name = m[1].trim();
      players.add(name);
      onPlayerJoin(name);
    }

    // Deteksi pemain keluar: "Nama left the game"
    m = line.match(/([^\s\[\]]+) left the game/i);
    if (m) {
      const name = m[1].trim();
      players.delete(name);
      onPlayerLeave(name);
    }
  });
}

function startServer() {
  if (state !== 'offline') return { ok: false, error: 'Server tidak sedang offline.' };
  if (!fs.existsSync(PMMP_PHAR)) {
    return { ok: false, error: 'PocketMine-MP.phar tidak ditemukan di folder pocketmine/. Ikuti SETUP.md dulu.' };
  }

  state = 'starting';
  players.clear();
  consoleBuf = [];
  bufSeq = 0;
  lastCpuSample = null;
  pushLine('>> Menjalankan PocketMine-MP...');

  try {
    proc = spawn(phpBinary(), [PMMP_PHAR, '--no-wizard'], { cwd: PMMP_DIR });
  } catch (e) {
    state = 'offline';
    return { ok: false, error: 'Gagal menjalankan PHP: ' + e.message };
  }

  startTime = Date.now();
  proc.stdout.on('data', handleChunk);
  proc.stderr.on('data', handleChunk);
  proc.on('error', (e) => {
    pushLine('>> Gagal menjalankan proses: ' + e.message);
    state = 'offline';
    proc = null;
  });
  proc.on('exit', (code) => {
    pushLine(`>> Proses server berhenti (kode ${code}).`);
    state = 'offline';
    proc = null;
    flushAllOnlinePlayers();
    if (stopKillTimer) { clearTimeout(stopKillTimer); stopKillTimer = null; }
  });

  return { ok: true };
}

function stopServer() {
  if (!proc || (state !== 'online' && state !== 'starting')) {
    return { ok: false, error: 'Server tidak sedang berjalan.' };
  }
  state = 'stopping';
  pushLine('>> Mengirim perintah stop...');
  try {
    proc.stdin.write('stop\n');
  } catch (e) {
    // stdin mungkin sudah tertutup
  }
  // Kalau 15 detik tidak berhenti sendiri, paksa matikan
  stopKillTimer = setTimeout(() => {
    if (proc) {
      pushLine('>> Server tidak merespons, dimatikan paksa.');
      proc.kill('SIGKILL');
    }
  }, 15000);
  return { ok: true };
}

function sendCommand(cmd) {
  if (!proc || state !== 'online') return { ok: false, error: 'Server tidak online.' };
  try {
    proc.stdin.write(cmd.trim() + '\n');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function readCpuRam() {
  if (!proc || !proc.pid) return { cpuPercent: 0, ramMB: 0 };
  try {
    const statusRaw = fs.readFileSync(`/proc/${proc.pid}/status`, 'utf8');
    const mm = statusRaw.match(/VmRSS:\s+(\d+) kB/);
    const ramMB = mm ? Math.round(parseInt(mm[1], 10) / 1024) : 0;

    const statRaw = fs.readFileSync(`/proc/${proc.pid}/stat`, 'utf8');
    const afterCmd = statRaw.slice(statRaw.lastIndexOf(')') + 2).trim().split(/\s+/);
    const utime = parseInt(afterCmd[11], 10);
    const stime = parseInt(afterCmd[12], 10);
    const now = Date.now();
    const CLK_TCK = 100;

    let cpuPercent = 0;
    if (lastCpuSample) {
      const dCpu = (utime + stime - (lastCpuSample.utime + lastCpuSample.stime)) / CLK_TCK;
      const dT = (now - lastCpuSample.t) / 1000;
      if (dT > 0) cpuPercent = Math.max(0, Math.min(100, Math.round((dCpu / dT) * 100)));
    }
    lastCpuSample = { utime, stime, t: now };
    return { cpuPercent, ramMB };
  } catch (e) {
    return { cpuPercent: 0, ramMB: 0 };
  }
}

// ====== HTTP SERVER ======
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', (c) => (data += c));
  req.on('end', () => {
    try {
      cb(null, data ? JSON.parse(data) : {});
    } catch (e) {
      cb(e);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // ---- API ----
  if (p === '/api/status' && req.method === 'GET') {
    const { cpuPercent, ramMB } = readCpuRam();
    return sendJSON(res, 200, {
      state,
      uptimeSec: startTime && state !== 'offline' ? Math.floor((Date.now() - startTime) / 1000) : 0,
      players: Array.from(players),
      playerCount: players.size,
      cpuPercent,
      ramMB,
    });
  }

  if (p === '/api/console' && req.method === 'GET') {
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const lines = consoleBuf.filter((l) => l.id > since);
    return sendJSON(res, 200, { lines, lastId: bufSeq });
  }

  if (p === '/api/start' && req.method === 'POST') {
    return sendJSON(res, 200, startServer());
  }

  if (p === '/api/stop' && req.method === 'POST') {
    return sendJSON(res, 200, stopServer());
  }

  if (p === '/api/restart' && req.method === 'POST') {
    const r = stopServer();
    if (!r.ok) return sendJSON(res, 200, r);
    const waitForOffline = setInterval(() => {
      if (state === 'offline') {
        clearInterval(waitForOffline);
        startServer();
      }
    }, 500);
    return sendJSON(res, 200, { ok: true });
  }

  if (p === '/api/command' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid' });
      return sendJSON(res, 200, sendCommand(String(body.command || '')));
    });
  }

  if (p === '/api/players' && req.method === 'GET') {
    const list = Object.values(playerDB)
      .map((rec) => {
        const key = rec.name.toLowerCase();
        const online = players.has(rec.name) || onlineSince.has(key);
        // Kalau sedang online, tambahkan durasi sesi berjalan ke waktu main yang ditampilkan
        const liveExtra = online && onlineSince.has(key) ? Math.round((Date.now() - onlineSince.get(key)) / 1000) : 0;
        return {
          name: rec.name,
          online,
          firstSeen: rec.firstSeen,
          lastJoin: rec.lastJoin,
          lastLeave: rec.lastLeave,
          totalPlaytimeSec: rec.totalPlaytimeSec + liveExtra,
          playtimeLabel: formatPlaytime(rec.totalPlaytimeSec + liveExtra),
          banned: isBanned(rec.name),
        };
      })
      .sort((a, b) => (b.lastJoin || 0) - (a.lastJoin || 0));
    return sendJSON(res, 200, { players: list });
  }

  if (p === '/api/players/kick' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid' });
      const name = String(body.name || '').trim();
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama pemain kosong.' });
      if (state !== 'online' || !players.has(name)) {
        return sendJSON(res, 200, { ok: false, error: 'Pemain sedang tidak online di server, tidak bisa di-kick.' });
      }
      return sendJSON(res, 200, sendCommand(`kick ${name} Dikeluarkan lewat panel BlockHost`));
    });
  }

  if (p === '/api/players/ban' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid' });
      const name = String(body.name || '').trim();
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama pemain kosong.' });
      if (state !== 'online') {
        return sendJSON(res, 200, { ok: false, error: 'Server harus ONLINE untuk ban/unban, karena PocketMine sendiri yang mengelola file banned-players.txt.' });
      }
      return sendJSON(res, 200, sendCommand(`ban ${name}`));
    });
  }

  if (p === '/api/players/unban' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid' });
      const name = String(body.name || '').trim();
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama pemain kosong.' });
      if (state !== 'online') {
        return sendJSON(res, 200, { ok: false, error: 'Server harus ONLINE untuk ban/unban, karena PocketMine sendiri yang mengelola file banned-players.txt.' });
      }
      return sendJSON(res, 200, sendCommand(`unban ${name}`));
    });
  }

  if (p === '/api/players/gamemode' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid' });
      const name = String(body.name || '').trim();
      const mode = String(body.mode || '').trim();
      if (!name || !['survival', 'creative', 'adventure', 'spectator'].includes(mode)) {
        return sendJSON(res, 200, { ok: false, error: 'Data tidak valid.' });
      }
      if (state !== 'online' || !players.has(name)) {
        return sendJSON(res, 200, { ok: false, error: 'Pemain harus sedang online untuk diubah mode-nya.' });
      }
      return sendJSON(res, 200, sendCommand(`gamemode ${mode} ${name}`));
    });
  }

  // ---- STATIC FILES (panel BlockHost) ----
  let filePath = p === '/' ? '/index.html' : p;
  filePath = path.join(PUBLIC_DIR, path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BlockHost backend jalan di http://0.0.0.0:${PORT}`);
  console.log('Buka panel dari browser HP: http://localhost:' + PORT);
  console.log('Buka dari HP/PC lain di WiFi yang sama: http://<ip-lokal-HP-ini>:' + PORT);
});
