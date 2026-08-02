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
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

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
const PLAYERS_DB_PATH = path.join(DATA_DIR, 'players.json'); // waktu main real, persisten (bukan dummy)
const VIP_PATH = path.join(DATA_DIR, 'vip.json'); // status VIP per-pemain (tier 1-3), persisten
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Plugin & backup ASLI (bukan dummy) — plugin dibaca langsung dari folder
// pocketmine/plugins (aktif) dan pocketmine/plugins_disabled (nonaktif);
// backup dibuat sebagai arsip tar.gz asli dari folder dunia.
const PLUGINS_DIR = path.join(PMMP_DIR, 'plugins');
const PLUGINS_DISABLED_DIR = path.join(PMMP_DIR, 'plugins_disabled');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const BACKUPS_META_PATH = path.join(DATA_DIR, 'backups.json');
const WORLDS_DIR = path.join(PMMP_DIR, 'worlds');
const PLUGIN_EXT_RE = /\.(phar|jar|zip)$/i;
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
if (!fs.existsSync(PLUGINS_DISABLED_DIR)) fs.mkdirSync(PLUGINS_DISABLED_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// Add-on (resource pack & behavior pack) ASLI — sama seperti plugin, dibaca
// langsung dari folder pocketmine/resource_packs(_disabled) dan
// behavior_packs(_disabled). Status aktif ditulis ke resource_packs.yml,
// file konfigurasi yang benar-benar dibaca PocketMine-MP saat server nyala.
const RESOURCE_PACKS_DIR = path.join(PMMP_DIR, 'resource_packs');
const RESOURCE_PACKS_DISABLED_DIR = path.join(PMMP_DIR, 'resource_packs_disabled');
const BEHAVIOR_PACKS_DIR = path.join(PMMP_DIR, 'behavior_packs');
const BEHAVIOR_PACKS_DISABLED_DIR = path.join(PMMP_DIR, 'behavior_packs_disabled');
const RESOURCE_PACKS_YML = path.join(PMMP_DIR, 'resource_packs.yml');
const ADDON_EXT_RE = /\.(mcpack|mcaddon|zip)$/i;
[RESOURCE_PACKS_DIR, RESOURCE_PACKS_DISABLED_DIR, BEHAVIOR_PACKS_DIR, BEHAVIOR_PACKS_DISABLED_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
if (!fs.existsSync(WORLDS_DIR)) fs.mkdirSync(WORLDS_DIR, { recursive: true });
const WORLD_EXT_RE = /\.(mcworld|zip)$/i;

function listPlugins() {
  const active = fs.existsSync(PLUGINS_DIR) ? fs.readdirSync(PLUGINS_DIR).filter((f) => PLUGIN_EXT_RE.test(f)) : [];
  const inactive = fs.existsSync(PLUGINS_DISABLED_DIR) ? fs.readdirSync(PLUGINS_DISABLED_DIR).filter((f) => PLUGIN_EXT_RE.test(f)) : [];
  return [
    ...active.map((name) => ({ name, active: true })),
    ...inactive.map((name) => ({ name, active: false })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

function togglePluginFile(name) {
  const safeName = path.basename(String(name || ''));
  if (!PLUGIN_EXT_RE.test(safeName)) return { ok: false, error: 'Nama plugin tidak valid.' };
  const activePath = path.join(PLUGINS_DIR, safeName);
  const inactivePath = path.join(PLUGINS_DISABLED_DIR, safeName);
  if (fs.existsSync(activePath)) {
    fs.renameSync(activePath, inactivePath);
    return { ok: true, active: false };
  }
  if (fs.existsSync(inactivePath)) {
    fs.renameSync(inactivePath, activePath);
    return { ok: true, active: true };
  }
  return { ok: false, error: 'File plugin tidak ditemukan.' };
}

function deletePluginFile(name) {
  const safeName = path.basename(String(name || ''));
  const activePath = path.join(PLUGINS_DIR, safeName);
  const inactivePath = path.join(PLUGINS_DISABLED_DIR, safeName);
  if (fs.existsSync(activePath)) { fs.unlinkSync(activePath); return { ok: true }; }
  if (fs.existsSync(inactivePath)) { fs.unlinkSync(inactivePath); return { ok: true }; }
  return { ok: false, error: 'File plugin tidak ditemukan.' };
}

function uploadPluginFile(name, dataBase64) {
  const safeName = path.basename(String(name || ''));
  if (!PLUGIN_EXT_RE.test(safeName)) {
    return { ok: false, error: 'Ekstensi file harus .phar, .jar, atau .zip.' };
  }
  let buf;
  try {
    buf = Buffer.from(String(dataBase64 || ''), 'base64');
  } catch (e) {
    return { ok: false, error: 'Data file tidak valid.' };
  }
  if (buf.length === 0) return { ok: false, error: 'File kosong.' };
  if (buf.length > 50 * 1024 * 1024) return { ok: false, error: 'Ukuran file melebihi batas 50 MB.' };
  fs.writeFileSync(path.join(PLUGINS_DIR, safeName), buf);
  return { ok: true, sizeBytes: buf.length };
}

// ====== ADD-ON (resource pack & behavior pack) ASLI ======
// .mcpack = satu paket (resource ATAU behavior). .mcaddon = zip berisi
// beberapa folder .mcpack sekaligus. Semuanya file zip biasa — dibongkar
// pakai binary "unzip" (di Termux: pkg install unzip -y).

function checkUnzipAvailable() {
  const r = spawnSync('unzip', ['-v']);
  return r.status === 0;
}

function dirSizeBytes(dir) {
  let total = 0;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return 0; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) total += dirSizeBytes(full);
    else {
      try { total += fs.statSync(full).size; } catch (e) {}
    }
  }
  return total;
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

function safeFolderName(name) {
  return String(name || 'pack')
    .trim()
    .replace(/\.(mcpack|mcaddon|zip)$/i, '')
    .replace(/[^a-zA-Z0-9_\-\.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'pack';
}

// Baca manifest.json sebuah folder pack untuk tahu jenisnya (resources /
// data=behavior / skins) dan nama aslinya. Kalau tidak ada manifest yang
// valid, dianggap resource pack (paling umum) supaya tetap bisa dipakai.
function readPackManifest(folder) {
  try {
    const raw = fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8');
    const m = JSON.parse(raw);
    const moduleType = (m.modules && m.modules[0] && m.modules[0].type) || 'resources';
    const type = moduleType === 'data' ? 'behavior' : 'resource';
    const name = (m.header && (m.header.name || m.header.description)) || null;
    const uuid = (m.header && m.header.uuid) || null;
    return { type, name, uuid, valid: true };
  } catch (e) {
    return { type: 'resource', name: null, uuid: null, valid: false };
  }
}

function listAddons() {
  function scan(dir, active, type) {
    let names = [];
    try { names = fs.readdirSync(dir).filter((n) => !n.startsWith('.')); } catch (e) { return []; }
    return names
      .filter((n) => fs.statSync(path.join(dir, n)).isDirectory())
      .map((n) => ({
        name: n,
        type,
        active,
        sizeLabel: formatBytes(dirSizeBytes(path.join(dir, n))),
      }));
  }
  return [
    ...scan(RESOURCE_PACKS_DIR, true, 'resource'),
    ...scan(RESOURCE_PACKS_DISABLED_DIR, false, 'resource'),
    ...scan(BEHAVIOR_PACKS_DIR, true, 'behavior'),
    ...scan(BEHAVIOR_PACKS_DISABLED_DIR, false, 'behavior'),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

// Tulis ulang resource_packs.yml supaya benar-benar cocok dengan isi folder
// resource_packs/ dan behavior_packs/ (yang aktif) — inilah yang membuat
// paket sungguhan dimuat oleh PocketMine-MP saat server dinyalakan.
function regenerateResourcePacksYml() {
  let resourceNames = [];
  let behaviorNames = [];
  try { resourceNames = fs.readdirSync(RESOURCE_PACKS_DIR).filter((n) => !n.startsWith('.')); } catch (e) {}
  try { behaviorNames = fs.readdirSync(BEHAVIOR_PACKS_DIR).filter((n) => !n.startsWith('.')); } catch (e) {}
  const yml =
    '# File ini di-generate otomatis oleh panel BlockHost — jangan diedit manual.\n' +
    'resource_stack:\n' +
    (resourceNames.map((n) => `  - "${n}"`).join('\n') || '  []') +
    '\nbehaviour_stack:\n' +
    (behaviorNames.map((n) => `  - "${n}"`).join('\n') || '  []') +
    '\nresource_force: false\n' +
    'behaviour_force: false\n';
  fs.writeFileSync(RESOURCE_PACKS_YML, yml);
}

function uploadAddonFile(name, dataBase64) {
  const safeName = path.basename(String(name || ''));
  if (!ADDON_EXT_RE.test(safeName)) {
    return { ok: false, error: 'Ekstensi file harus .mcpack, .mcaddon, atau .zip.' };
  }
  if (!checkUnzipAvailable()) {
    return { ok: false, error: 'Binary "unzip" tidak ditemukan di server. Jalankan: pkg install unzip -y (Termux) lalu coba lagi.' };
  }
  let buf;
  try { buf = Buffer.from(String(dataBase64 || ''), 'base64'); } catch (e) {
    return { ok: false, error: 'Data file tidak valid.' };
  }
  if (buf.length === 0) return { ok: false, error: 'File kosong.' };
  if (buf.length > 150 * 1024 * 1024) return { ok: false, error: 'Ukuran file melebihi batas 150 MB.' };

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-addon-'));
  const tmpZip = path.join(tmpRoot, 'pack.zip');
  const tmpExtract = path.join(tmpRoot, 'extract');
  fs.mkdirSync(tmpExtract, { recursive: true });
  fs.writeFileSync(tmpZip, buf);

  const unzipResult = spawnSync('unzip', ['-o', '-q', tmpZip, '-d', tmpExtract]);
  if (unzipResult.status !== 0) {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
    return { ok: false, error: 'Gagal membongkar file. Pastikan file .mcpack/.mcaddon/.zip tidak rusak.' };
  }

  // Cari folder-folder yang punya manifest.json: langsung di root ekstraksi
  // (berarti 1 pack / .mcpack), atau satu tingkat di bawahnya (berarti
  // .mcaddon berisi beberapa pack sekaligus).
  let packFolders = [];
  if (fs.existsSync(path.join(tmpExtract, 'manifest.json'))) {
    packFolders = [tmpExtract];
  } else {
    let subEntries = [];
    try { subEntries = fs.readdirSync(tmpExtract, { withFileTypes: true }); } catch (e) {}
    packFolders = subEntries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(tmpExtract, e.name))
      .filter((full) => fs.existsSync(path.join(full, 'manifest.json')));
  }

  if (packFolders.length === 0) {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
    return { ok: false, error: 'File ini bukan add-on Bedrock yang valid (manifest.json tidak ditemukan).' };
  }

  const added = [];
  for (const folder of packFolders) {
    const info = readPackManifest(folder);
    const baseName = info.name || (packFolders.length === 1 ? safeName : path.basename(folder));
    let folderName = safeFolderName(baseName);
    const targetDir = info.type === 'behavior' ? BEHAVIOR_PACKS_DIR : RESOURCE_PACKS_DIR;
    let finalPath = path.join(targetDir, folderName);
    let suffix = 2;
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(targetDir, `${folderName}-${suffix}`);
      suffix++;
    }
    fs.cpSync(folder, finalPath, { recursive: true });
    added.push({ name: path.basename(finalPath), type: info.type });
  }

  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
  regenerateResourcePacksYml();
  return { ok: true, added };
}

function toggleAddonFolder(name, type) {
  const safeName = path.basename(String(name || ''));
  if (!safeName) return { ok: false, error: 'Nama add-on wajib diisi.' };
  const activeDir = type === 'behavior' ? BEHAVIOR_PACKS_DIR : RESOURCE_PACKS_DIR;
  const disabledDir = type === 'behavior' ? BEHAVIOR_PACKS_DISABLED_DIR : RESOURCE_PACKS_DISABLED_DIR;
  const activePath = path.join(activeDir, safeName);
  const disabledPath = path.join(disabledDir, safeName);
  if (fs.existsSync(activePath)) {
    fs.renameSync(activePath, disabledPath);
    regenerateResourcePacksYml();
    return { ok: true, active: false };
  }
  if (fs.existsSync(disabledPath)) {
    fs.renameSync(disabledPath, activePath);
    regenerateResourcePacksYml();
    return { ok: true, active: true };
  }
  return { ok: false, error: 'Add-on tidak ditemukan.' };
}

function removeAddonFolder(name, type) {
  const safeName = path.basename(String(name || ''));
  if (!safeName) return { ok: false, error: 'Nama add-on wajib diisi.' };
  const activeDir = type === 'behavior' ? BEHAVIOR_PACKS_DIR : RESOURCE_PACKS_DIR;
  const disabledDir = type === 'behavior' ? BEHAVIOR_PACKS_DISABLED_DIR : RESOURCE_PACKS_DISABLED_DIR;
  const activePath = path.join(activeDir, safeName);
  const disabledPath = path.join(disabledDir, safeName);
  if (fs.existsSync(activePath)) {
    fs.rmSync(activePath, { recursive: true, force: true });
    regenerateResourcePacksYml();
    return { ok: true };
  }
  if (fs.existsSync(disabledPath)) {
    fs.rmSync(disabledPath, { recursive: true, force: true });
    return { ok: true };
  }
  return { ok: false, error: 'Add-on tidak ditemukan.' };
}

// ====== MAP / DUNIA (world) ASLI ======
// .mcworld sebenarnya adalah file zip berisi level.dat dkk di root-nya.
// Dunia aktif ditentukan lewat "level-name" di server.properties — file
// konfigurasi yang benar-benar dibaca PocketMine-MP.

function getActiveWorldName() {
  try {
    const raw = fs.readFileSync(path.join(PMMP_DIR, 'server.properties'), 'utf8');
    const m = raw.match(/^level-name=(.*)$/m);
    if (m) return m[1].trim();
  } catch (e) {}
  return null;
}

function listWorlds() {
  let names = [];
  try { names = fs.readdirSync(WORLDS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch (e) { return []; }
  const activeName = getActiveWorldName();
  return names
    .filter((n) => !n.startsWith('.'))
    .map((n) => ({
      name: n,
      active: n === activeName,
      valid: fs.existsSync(path.join(WORLDS_DIR, n, 'level.dat')),
      sizeLabel: formatBytes(dirSizeBytes(path.join(WORLDS_DIR, n))),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function uploadWorldFile(name, dataBase64) {
  const safeName = path.basename(String(name || ''));
  if (!WORLD_EXT_RE.test(safeName)) {
    return { ok: false, error: 'Ekstensi file harus .mcworld atau .zip.' };
  }
  if (!checkUnzipAvailable()) {
    return { ok: false, error: 'Binary "unzip" tidak ditemukan di server. Jalankan: pkg install unzip -y (Termux) lalu coba lagi.' };
  }
  let buf;
  try { buf = Buffer.from(String(dataBase64 || ''), 'base64'); } catch (e) {
    return { ok: false, error: 'Data file tidak valid.' };
  }
  if (buf.length === 0) return { ok: false, error: 'File kosong.' };
  if (buf.length > 400 * 1024 * 1024) return { ok: false, error: 'Ukuran file melebihi batas 400 MB.' };

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-world-'));
  const tmpZip = path.join(tmpRoot, 'world.zip');
  const tmpExtract = path.join(tmpRoot, 'extract');
  fs.mkdirSync(tmpExtract, { recursive: true });
  fs.writeFileSync(tmpZip, buf);

  const unzipResult = spawnSync('unzip', ['-o', '-q', tmpZip, '-d', tmpExtract]);
  if (unzipResult.status !== 0) {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
    return { ok: false, error: 'Gagal membongkar file. Pastikan file .mcworld/.zip tidak rusak.' };
  }

  // level.dat biasanya ada langsung di root zip .mcworld; kalau ternyata
  // dibungkus satu folder tambahan, turun satu level supaya tetap terbaca.
  let sourceDir = tmpExtract;
  if (!fs.existsSync(path.join(sourceDir, 'level.dat'))) {
    let subEntries = [];
    try { subEntries = fs.readdirSync(tmpExtract, { withFileTypes: true }); } catch (e) {}
    const dirs = subEntries.filter((e) => e.isDirectory());
    if (dirs.length === 1 && fs.existsSync(path.join(tmpExtract, dirs[0].name, 'level.dat'))) {
      sourceDir = path.join(tmpExtract, dirs[0].name);
    }
  }
  if (!fs.existsSync(path.join(sourceDir, 'level.dat'))) {
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
    return { ok: false, error: 'File ini bukan dunia Bedrock yang valid (level.dat tidak ditemukan).' };
  }

  let folderName = safeFolderName(safeName);
  let finalPath = path.join(WORLDS_DIR, folderName);
  let suffix = 2;
  while (fs.existsSync(finalPath)) {
    finalPath = path.join(WORLDS_DIR, `${folderName}-${suffix}`);
    suffix++;
  }
  fs.cpSync(sourceDir, finalPath, { recursive: true });
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) {}
  return { ok: true, name: path.basename(finalPath) };
}

function activateWorld(name) {
  const safeName = path.basename(String(name || ''));
  const worldPath = path.join(WORLDS_DIR, safeName);
  if (!fs.existsSync(path.join(worldPath, 'level.dat'))) {
    return { ok: false, error: 'Dunia tidak ditemukan.' };
  }
  const propsPath = path.join(PMMP_DIR, 'server.properties');
  let raw = '';
  try { raw = fs.readFileSync(propsPath, 'utf8'); } catch (e) {
    return { ok: false, error: 'server.properties belum ada — jalankan PocketMine-MP minimal sekali dulu (lihat SETUP.md).' };
  }
  if (/^level-name=.*$/m.test(raw)) {
    raw = raw.replace(/^level-name=.*$/m, `level-name=${safeName}`);
  } else {
    raw += `\nlevel-name=${safeName}\n`;
  }
  fs.writeFileSync(propsPath, raw);
  return { ok: true, requiresRestart: state !== 'offline' };
}

function deleteWorldFolder(name) {
  const safeName = path.basename(String(name || ''));
  if (safeName === getActiveWorldName()) {
    return { ok: false, error: 'Tidak bisa hapus dunia yang sedang aktif. Aktifkan dunia lain dulu.' };
  }
  const worldPath = path.join(WORLDS_DIR, safeName);
  if (!fs.existsSync(worldPath)) return { ok: false, error: 'Dunia tidak ditemukan.' };
  fs.rmSync(worldPath, { recursive: true, force: true });
  return { ok: true };
}

function loadBackupsMeta() {
  try {
    if (!fs.existsSync(BACKUPS_META_PATH)) return [];
    return JSON.parse(fs.readFileSync(BACKUPS_META_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}
let backupsMeta = loadBackupsMeta(); // [{ id, time, file, sizeBytes, auto }]
function saveBackupsMeta() {
  fs.writeFileSync(BACKUPS_META_PATH, JSON.stringify(backupsMeta, null, 2));
}

function createRealBackup(auto) {
  if (!fs.existsSync(WORLDS_DIR)) {
    return { ok: false, error: 'Folder worlds/ belum ada. Jalankan server minimal sekali dulu.' };
  }
  const id = 'bk_' + Date.now();
  const fileName = `backup-${Date.now()}.tar.gz`;
  const filePath = path.join(BACKUPS_DIR, fileName);
  const result = spawnSync('tar', ['-czf', filePath, '-C', PMMP_DIR, 'worlds']);
  if (result.status !== 0) {
    return { ok: false, error: 'Gagal membuat backup: ' + (result.stderr ? result.stderr.toString() : 'tar tidak tersedia') };
  }
  const stat = fs.statSync(filePath);
  const entry = { id, time: Date.now(), file: fileName, sizeBytes: stat.size, auto: !!auto };
  backupsMeta.unshift(entry);
  saveBackupsMeta();
  return { ok: true, backup: entry };
}

function restoreRealBackup(id) {
  const entry = backupsMeta.find((b) => b.id === id);
  if (!entry) return { ok: false, error: 'Backup tidak ditemukan.' };
  const filePath = path.join(BACKUPS_DIR, entry.file);
  if (!fs.existsSync(filePath)) return { ok: false, error: 'File backup hilang dari disk.' };
  if (state !== 'offline') {
    return { ok: false, error: 'Matikan server dulu sebelum memulihkan backup, supaya dunia tidak rusak.' };
  }
  const result = spawnSync('tar', ['-xzf', filePath, '-C', PMMP_DIR]);
  if (result.status !== 0) {
    return { ok: false, error: 'Gagal memulihkan backup: ' + (result.stderr ? result.stderr.toString() : '') };
  }
  return { ok: true };
}

function deleteRealBackup(id) {
  const idx = backupsMeta.findIndex((b) => b.id === id);
  if (idx === -1) return { ok: false, error: 'Backup tidak ditemukan.' };
  const entry = backupsMeta[idx];
  try { fs.unlinkSync(path.join(BACKUPS_DIR, entry.file)); } catch (e) { /* file mungkin sudah hilang */ }
  backupsMeta.splice(idx, 1);
  saveBackupsMeta();
  return { ok: true };
}

// ====== VIP PEMAIN (tier 1-3, masing-masing punya privilege sendiri) ======
// Catatan: perintah di bawah pakai command bawaan PocketMine-MP (bukan plugin).
// Kalau versi PocketMine kamu punya nama/format command yang beda, tinggal
// sesuaikan array "commands" di sini — sisanya (penyimpanan, API, panel) tetap jalan.
const VIP_TIERS = {
  1: {
    id: 1,
    label: 'VIP I',
    name: 'VIP Perunggu',
    color: '#c17a3d',
    privileges: [
      'Lencana VIP I di panel & daftar pemain',
      'Pesan sambutan spesial tiap kali login',
      'Bonus 10 level XP tiap kali login',
    ],
    commands: [
      'title {player} title §6✦ Selamat datang, VIP I {player}! §6✦',
      'title {player} subtitle §7Terima kasih sudah mendukung server ini',
      'xp 10L {player}',
    ],
  },
  2: {
    id: 2,
    label: 'VIP II',
    name: 'VIP Perak',
    color: '#9aa0a6',
    privileges: [
      'Semua privilege VIP I',
      'Buff Speed sesaat tiap kali login',
      'Bonus 25 level XP tiap kali login',
      'Bisa minta pindah ke mode Creative kapan saja lewat admin',
    ],
    commands: [
      'title {player} title §f✦ Selamat datang, VIP II {player}! §f✦',
      'title {player} subtitle §7Terima kasih sudah mendukung server ini',
      'effect {player} speed 60 0',
      'xp 25L {player}',
    ],
  },
  3: {
    id: 3,
    label: 'VIP III',
    name: 'VIP Emas',
    color: '#eab308',
    privileges: [
      'Semua privilege VIP II',
      'Status Operator penuh (akses semua command server)',
      'Buff Regenerasi tiap kali login',
      'Bonus 50 level XP tiap kali login',
    ],
    commands: [
      'title {player} title §e✦ Selamat datang, VIP III {player}! ✦',
      'title {player} subtitle §7Terima kasih banyak atas dukungannya!',
      'effect {player} regeneration 30 1',
      'xp 50L {player}',
      'op {player}',
    ],
    autoOp: true, // tier ini otomatis di-op; kalau diturunkan, otomatis di-deop lagi
  },
};

function loadVip() {
  try {
    if (!fs.existsSync(VIP_PATH)) return {};
    return JSON.parse(fs.readFileSync(VIP_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}
function saveVip(vip) {
  fs.writeFileSync(VIP_PATH, JSON.stringify(vip, null, 2));
}
// Catatan: vip.json SENGAJA tidak di-cache di variabel global — selalu
// dibaca ulang dari disk tiap dipakai (sama seperti users.json). Ini penting
// karena payment-confirm bisa menulis file ini langsung dari proses lain
// (server terpisah) saat admin konfirmasi pembelian VIP; kalau di-cache,
// perubahan itu bisa ketimpa lagi oleh data lama di memori.

function vipTierPublicList() {
  return Object.values(VIP_TIERS).map((t) => ({
    id: t.id, label: t.label, name: t.name, color: t.color, privileges: t.privileges,
  }));
}

// Jalankan perintah privilege VIP untuk satu pemain (dipanggil saat admin
// mengatur tier-nya, dan otomatis lagi tiap kali pemain itu login).
function applyVipPerks(name) {
  const vipDB = loadVip();
  const key = name.toLowerCase();
  const entry = vipDB[key];
  if (!entry || !entry.tier) return { ok: false, error: 'Pemain ini belum punya VIP.' };
  const tierDef = VIP_TIERS[entry.tier];
  if (!tierDef) return { ok: false, error: 'Tier VIP tidak dikenal.' };
  if (!proc || state !== 'online') {
    return { ok: false, error: 'Server sedang offline — privilege akan otomatis diberikan saat pemain ini login nanti.' };
  }
  tierDef.commands.forEach((tpl) => sendCommand(tpl.replace(/\{player\}/g, entry.name || name)));
  entry.autoOpped = !!tierDef.autoOp;
  saveVip(vipDB);
  return { ok: true };
}

// Kalau pemain diturunkan/dihapus dari VIP III padahal sebelumnya di-op
// otomatis oleh sistem VIP (bukan di-op manual oleh admin), lepas op-nya lagi.
function maybeRevokeAutoOp(name, entry) {
  if (entry && entry.autoOpped && (!proc || state !== 'online')) return; // server offline, tidak bisa deop sekarang
  if (entry && entry.autoOpped) {
    sendCommand('deop ' + name);
  }
}

// ---- Waktu main ASLI: dihitung dari selisih waktu join-leave, disimpan persisten ----
function loadPlayerDB() {
  try {
    if (!fs.existsSync(PLAYERS_DB_PATH)) return {};
    return JSON.parse(fs.readFileSync(PLAYERS_DB_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}
let playerDB = loadPlayerDB(); // key(nama lower) -> { totalPlaytimeSec }
let onlineSince = new Map();   // key(nama lower) -> timestamp join (sesi berjalan)
let playerDBSaveTimer = null;
function savePlayerDBSoon() {
  if (playerDBSaveTimer) return;
  playerDBSaveTimer = setTimeout(() => {
    playerDBSaveTimer = null;
    try {
      fs.writeFileSync(PLAYERS_DB_PATH, JSON.stringify(playerDB, null, 2));
    } catch (e) {
      pushLine('>> Gagal menyimpan waktu main pemain: ' + e.message);
    }
  }, 500);
}
function onPlayerJoin(name) {
  onlineSince.set(name.toLowerCase(), Date.now());
}
function onPlayerLeave(name) {
  const key = name.toLowerCase();
  const joinedAt = onlineSince.get(key);
  if (joinedAt) {
    if (!playerDB[key]) playerDB[key] = { totalPlaytimeSec: 0 };
    playerDB[key].totalPlaytimeSec += Math.max(0, Math.round((Date.now() - joinedAt) / 1000));
    savePlayerDBSoon();
  }
  onlineSince.delete(key);
}
// Kalau proses berhenti/crash sebelum sempat kirim baris "left the game",
// tetap tutup semua sesi yang masih berjalan supaya waktu main tidak hilang.
function flushAllOnlinePlayers() {
  for (const name of players) onPlayerLeave(name);
}
function formatPlaytime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}j ${m}m`;
}

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

// ---- Deteksi alamat & port asli, biar tidak pakai domain contoh (play.blockhost.com) ----
function getLanIp() {
  const ifaces = os.networkInterfaces();
  // Prioritaskan wlan0 (WiFi di Android/Termux) karena itu yang dipakai
  // HP lain di jaringan WiFi yang sama untuk konek ke server ini.
  const preferredOrder = ['wlan0', ...Object.keys(ifaces).filter((n) => n !== 'wlan0')];
  for (const name of preferredOrder) {
    if (!ifaces[name]) continue;
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}
function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^127\./.test(ip)
  );
}
function getMinecraftPort() {
  try {
    const propsPath = path.join(PMMP_DIR, 'server.properties');
    const raw = fs.readFileSync(propsPath, 'utf8');
    const m = raw.match(/^server-port=(\d+)/m);
    if (m) return parseInt(m[1], 10);
  } catch (e) {
    // server.properties belum ada (PocketMine belum pernah dijalankan) — pakai default
  }
  return 19132;
}

// ---- Baca daftar nama dari file .txt PocketMine (ops.txt, white-list.txt, dst) ----
function readNameListFile(filename) {
  try {
    const raw = fs.readFileSync(path.join(PMMP_DIR, filename), 'utf8');
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.toLowerCase());
  } catch (e) {
    return [];
  }
}

// ---- Database pemain ASLI: gabungan file players/*.dat + ops/whitelist/banned-players ----
function getRealPlayerList() {
  const playersDir = path.join(PMMP_DIR, 'players');
  const ops = readNameListFile('ops.txt');
  const banned = readNameListFile('banned-players.txt');
  const whitelist = readNameListFile('white-list.txt');
  const onlineNow = new Set(Array.from(players).map((n) => n.toLowerCase()));

  let files = [];
  try {
    files = fs.readdirSync(playersDir).filter((f) => f.endsWith('.dat'));
  } catch (e) {
    return []; // folder belum ada — server belum pernah menyimpan data pemain
  }

  const vipDB = loadVip();
  return files.map((f) => {
    const name = f.slice(0, -4); // buang ekstensi .dat
    const lower = name.toLowerCase();
    let lastSeen = null;
    try {
      lastSeen = fs.statSync(path.join(playersDir, f)).mtime.getTime();
    } catch (e) {}
    const liveExtra = onlineSince.has(lower) ? Math.round((Date.now() - onlineSince.get(lower)) / 1000) : 0;
    const totalPlaytimeSec = ((playerDB[lower] && playerDB[lower].totalPlaytimeSec) || 0) + liveExtra;
    const vipEntry = vipDB[lower];
    const vipTierDef = vipEntry && vipEntry.tier ? VIP_TIERS[vipEntry.tier] : null;
    return {
      name,
      online: onlineNow.has(lower),
      op: ops.includes(lower),
      banned: banned.includes(lower),
      whitelisted: whitelist.includes(lower),
      lastSeen,
      totalPlaytimeSec,
      playtimeLabel: formatPlaytime(totalPlaytimeSec),
      vipTier: vipTierDef ? vipTierDef.id : 0,
      vipLabel: vipTierDef ? vipTierDef.label : null,
      vipColor: vipTierDef ? vipTierDef.color : null,
    };
  }).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
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
    if (m) { const name = m[1].trim(); players.add(name); onPlayerJoin(name); applyVipPerks(name); }

    // Deteksi pemain keluar: "Nama left the game"
    m = line.match(/([^\s\[\]]+) left the game/i);
    if (m) { const name = m[1].trim(); players.delete(name); onPlayerLeave(name); }
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

// ====== Proxy internal ke payment-confirm ======
// Supaya panel & payment-confirm bisa diakses lewat SATU tunnel/domain yang
// sama (mis. saat panel dibuka lewat Cloudflare Tunnel), semua permintaan
// terkait pembayaran diteruskan di sini, di sisi server (localhost ke
// localhost) — browser tidak perlu tahu port payment-confirm sama sekali.
// Kalau kamu jalankan payment-confirm di port lain, ubah nilai ini.
const PAYMENT_CONFIRM_TARGET = process.env.PAYMENT_CONFIRM_URL || 'http://127.0.0.1:3001';

function proxyToPaymentConfirm(req, res, targetPath) {
  let target;
  try {
    target = new URL(targetPath, PAYMENT_CONFIRM_TARGET);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('URL tidak valid.');
  }
  const proxyReq = http.request(target, {
    method: req.method,
    headers: { ...req.headers, host: target.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => {
    const isApi = targetPath.startsWith('/api/');
    res.writeHead(502, { 'Content-Type': isApi ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' });
    if (isApi) {
      res.end(JSON.stringify({ ok: false, error: 'Tidak bisa menghubungi payment-confirm. Pastikan servernya jalan (node server.js di folder payment-confirm).' }));
    } else {
      res.end('<h1>payment-confirm belum jalan</h1><p>Jalankan <code>node server.js</code> di folder payment-confirm dulu.</p>');
    }
  });
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // ---- Proxy ke payment-confirm: form/admin bayar via /bayar/*, API via /api/payment/* ----
  if (p === '/bayar') {
    res.writeHead(302, { Location: '/bayar/' + (url.search || '') });
    return res.end();
  }
  if (p.startsWith('/bayar/')) {
    return proxyToPaymentConfirm(req, res, p.slice('/bayar'.length) + (url.search || ''));
  }
  if (p.startsWith('/api/payment/')) {
    return proxyToPaymentConfirm(req, res, p + (url.search || ''));
  }

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

  // ---- Alamat & port ASLI untuk connect ke server (bukan domain contoh) ----
  if (p === '/api/connection-info' && req.method === 'GET') {
    const ip = getLanIp();
    return sendJSON(res, 200, {
      ok: true,
      ip,
      port: getMinecraftPort(),
      isPrivate: isPrivateIp(ip), // true = cuma bisa diakses di WiFi yang sama, bukan dari internet
    });
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

  // ---- Database pemain ASLI: baca dari file PocketMine, bukan data contoh ----
  if (p === '/api/players' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, players: getRealPlayerList() });
  }

  // ---- VIP: daftar tier 1-3 & privilege masing-masing ----
  if (p === '/api/vip/tiers' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, tiers: vipTierPublicList() });
  }

  // ---- VIP: atur tier pemain (0 = cabut VIP, 1-3 = pasang tier) ----
  if (p === '/api/vip/set' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      const name = String(body.name || '').trim();
      const tier = parseInt(body.tier, 10);
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama pemain wajib diisi.' });
      if (![0, 1, 2, 3].includes(tier)) return sendJSON(res, 200, { ok: false, error: 'Tier VIP tidak valid (0-3).' });

      const vipDB = loadVip();
      const key = name.toLowerCase();
      const prevEntry = vipDB[key];

      if (tier === 0) {
        delete vipDB[key];
        saveVip(vipDB);
        maybeRevokeAutoOp(name, prevEntry);
        return sendJSON(res, 200, { ok: true, vip: null });
      }

      const carryAutoOpped = tier === 3 && prevEntry ? !!prevEntry.autoOpped : false;
      vipDB[key] = { name, tier, autoOpped: carryAutoOpped, updatedAt: Date.now() };
      saveVip(vipDB);
      // Kalau turun dari tier 3 (auto-op) ke tier 1/2, lepas op otomatisnya dulu.
      if (prevEntry && prevEntry.autoOpped && tier !== 3) maybeRevokeAutoOp(name, prevEntry);
      const applied = applyVipPerks(name);
      return sendJSON(res, 200, { ok: true, vip: vipDB[key], perksApplied: applied.ok, perksNote: applied.error || null });
    });
  }

  // ---- VIP: kirim ulang privilege pemain (tanpa ganti tier) ----
  if (p === '/api/vip/reapply' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      const name = String(body.name || '').trim();
      if (!name) return sendJSON(res, 200, { ok: false, error: 'Nama pemain wajib diisi.' });
      const result = applyVipPerks(name);
      return sendJSON(res, 200, result);
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

  // ---- Plugin ASLI: baca/aktifkan/nonaktifkan/hapus/upload file di folder pocketmine/plugins ----
  if (p === '/api/plugins' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, plugins: listPlugins() });
  }
  if (p === '/api/plugins/toggle' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, togglePluginFile(body.name));
    });
  }
  if (p === '/api/plugins/delete' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, deletePluginFile(body.name));
    });
  }
  if (p === '/api/plugins/upload' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, uploadPluginFile(body.name, body.dataBase64));
    });
  }

  // ---- Add-on ASLI: resource pack & behavior pack sungguhan di folder
  // pocketmine/resource_packs & behavior_packs, aktif/nonaktif ditulis ke
  // resource_packs.yml (dibaca langsung oleh PocketMine-MP) ----
  if (p === '/api/addons' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, addons: listAddons() });
  }
  if (p === '/api/addons/upload' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, uploadAddonFile(body.name, body.dataBase64));
    });
  }
  if (p === '/api/addons/toggle' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, toggleAddonFolder(body.name, body.type));
    });
  }
  if (p === '/api/addons/delete' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, removeAddonFolder(body.name, body.type));
    });
  }

  // ---- Map/Dunia ASLI: dunia sungguhan di folder pocketmine/worlds,
  // dunia aktif ditulis ke server.properties (level-name) ----
  if (p === '/api/worlds' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, worlds: listWorlds() });
  }
  if (p === '/api/worlds/upload' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, uploadWorldFile(body.name, body.dataBase64));
    });
  }
  if (p === '/api/worlds/activate' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, activateWorld(body.name));
    });
  }
  if (p === '/api/worlds/delete' && req.method === 'POST') {
    return readBody(req, (err, body) => {
      if (err) return sendJSON(res, 400, { ok: false, error: 'Body tidak valid.' });
      return sendJSON(res, 200, deleteWorldFolder(body.name));
    });
  }

  // ---- Backup ASLI: arsip tar.gz sungguhan dari folder worlds/ ----
  if (p === '/api/backups' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, backups: backupsMeta });
  }
  if (p === '/api/backups' && req.method === 'POST') {
    return sendJSON(res, 200, createRealBackup(false));
  }
  if (p.startsWith('/api/backups/') && p.endsWith('/restore') && req.method === 'POST') {
    return sendJSON(res, 200, restoreRealBackup(p.split('/')[3]));
  }
  if (p.startsWith('/api/backups/') && req.method === 'DELETE') {
    return sendJSON(res, 200, deleteRealBackup(p.split('/')[3]));
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
