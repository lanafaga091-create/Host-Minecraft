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
const crypto = require('crypto');
const { spawn } = require('child_process');

// ====== KONFIGURASI ======
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PMMP_DIR = path.join(__dirname, 'pocketmine');
const PMMP_PHAR = path.join(PMMP_DIR, 'PocketMine-MP.phar');
const LOCAL_PHP_BIN = path.join(PMMP_DIR, 'php'); // dipakai kalau kamu taruh binary php di sini

// Akun & status paket sekarang disimpan di server (data/users.json), bukan
// lagi di localStorage browser. File ini yang juga dibaca/ditulis oleh
// modul payment-confirm saat admin mengonfirmasi pembayaran.
const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) return {};
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}
function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(hash));
}
function publicUser(u) {
  return {
    name: u.name,
    email: u.email,
    joined: u.joined,
    tier: u.tier || 'Free',
    tierExpiry: u.tierExpiry || null,
    freeTrialUsed: !!u.freeTrialUsed,
    transactions: u.transactions || [],
  };
}
// ==========================

let proc = null;
let state = 'offline'; // offline | starting | online | stopping
let startTime = null;
let consoleBuf = [];   // { id, text }
let bufSeq = 0;
let players = new Set();
let lastCpuSample = null; // { utime, stime, t }
let stopKillTimer = null;

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
    if (m) players.add(m[1].trim());

    // Deteksi pemain keluar: "Nama left the game"
    m = line.match(/([^\s\[\]]+) left the game/i);
    if (m) players.delete(m[1].trim());
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
    players.clear();
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

  // ---- Auth: daftar akun baru (disimpan di server) ----
  if (p === '/api/auth/register' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama wajib diisi.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJSON(res, 200, { ok: false, error: 'Email tidak valid.' });
      if (password.length < 6) return sendJSON(res, 200, { ok: false, error: 'Kata sandi minimal 6 karakter.' });

      const users = loadUsers();
      if (users[email]) return sendJSON(res, 200, { ok: false, error: 'Email sudah terdaftar.' });

      const { salt, hash } = hashPassword(password);
      users[email] = {
        name, email, salt, hash,
        joined: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        tier: 'Belum ada paket',
        tierExpiry: null,
        freeTrialUsed: false,
        transactions: [],
      };
      saveUsers(users);
      return sendJSON(res, 200, { ok: true, user: publicUser(users[email]) });
    });
  }

  // ---- Auth: masuk ----
  if (p === '/api/auth/login' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const users = loadUsers();
      const user = users[email];
      if (!user) return sendJSON(res, 200, { ok: false, error: 'Email belum terdaftar.' });
      if (!verifyPassword(password, user.salt, user.hash)) {
        return sendJSON(res, 200, { ok: false, error: 'Kata sandi salah.' });
      }
      return sendJSON(res, 200, { ok: true, user: publicUser(user) });
    });
  }

  // ---- Tier: cek status paket akun (dipanggil berkala oleh panel) ----
  if (p === '/api/tier' && req.method === 'GET') {
    const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
    if (!email) return sendJSON(res, 200, { ok: false, error: 'Email wajib diisi.' });
    const users = loadUsers();
    const user = users[email];
    if (!user) return sendJSON(res, 200, { ok: false, error: 'Akun tidak ditemukan.' });
    return sendJSON(res, 200, { ok: true, user: publicUser(user) });
  }

  // ---- Tier: pakai jatah paket Free (30 menit, sekali per akun) ----
  if (p === '/api/tier/free-trial' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      const email = String(body.email || '').trim().toLowerCase();
      const users = loadUsers();
      const user = users[email];
      if (!user) return sendJSON(res, 200, { ok: false, error: 'Akun tidak ditemukan.' });
      if (user.freeTrialUsed) return sendJSON(res, 200, { ok: false, error: 'Jatah paket Free sudah pernah dipakai akun ini.' });

      user.tier = 'Free';
      user.tierExpiry = Date.now() + 30 * 60 * 1000; // 30 menit
      user.freeTrialUsed = true;
      user.transactions = user.transactions || [];
      user.transactions.unshift({
        invoiceId: 'FREE-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        tier: 'Free', price: 'Rp0', date: Date.now(), confirmedVia: 'free-trial',
      });
      saveUsers(users);
      return sendJSON(res, 200, { ok: true, user: publicUser(user) });
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
