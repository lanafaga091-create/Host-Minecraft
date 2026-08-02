<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Setup BlockHost di Termux</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#12151a;
    --bg-card:#1a1f27;
    --bg-code:#0d1014;
    --line:#2a313c;
    --text:#e7e5df;
    --text-dim:#9aa3ad;
    --accent:#8bb85e;
    --accent-dim:#5d7a3f;
    --warn:#d99a3d;
    --err:#c1584b;
    --radius:10px;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    background:var(--bg);
    color:var(--text);
    font-family:'Inter',sans-serif;
    line-height:1.55;
    padding-bottom:80px;
  }
  a{color:var(--accent);}
  code, .mono{font-family:'JetBrains Mono',monospace;}

  /* header */
  header{
    padding:36px 20px 24px;
    border-bottom:1px solid var(--line);
    position:relative;
    overflow:hidden;
  }
  header::before{
    content:"";
    position:absolute; inset:0;
    background:
      linear-gradient(180deg, rgba(139,184,94,0.08), transparent 60%);
    pointer-events:none;
  }
  .prompt-line{
    font-family:'JetBrains Mono',monospace;
    color:var(--accent);
    font-size:13px;
    letter-spacing:0.02em;
    margin-bottom:10px;
  }
  .prompt-line::before{content:"$ ";color:var(--text-dim);}
  h1{
    margin:0 0 8px;
    font-family:'JetBrains Mono',monospace;
    font-size:clamp(22px,6vw,30px);
    font-weight:700;
    letter-spacing:-0.01em;
  }
  .subtitle{color:var(--text-dim); font-size:14.5px; max-width:60ch;}

  /* progress bar */
  .progress-wrap{
    padding:14px 20px;
    background:var(--bg-card);
    border-bottom:1px solid var(--line);
    position:sticky; top:0; z-index:10;
    backdrop-filter:blur(6px);
  }
  .progress-label{
    display:flex; justify-content:space-between;
    font-size:12px; color:var(--text-dim);
    margin-bottom:6px; font-family:'JetBrains Mono',monospace;
  }
  .progress-track{
    height:6px; border-radius:4px; background:var(--line); overflow:hidden;
  }
  .progress-fill{
    height:100%; background:linear-gradient(90deg,var(--accent-dim),var(--accent));
    width:0%; transition:width .4s ease;
  }

  main{max-width:720px; margin:0 auto; padding:24px 16px;}

  /* section card */
  .section{
    background:var(--bg-card);
    border:1px solid var(--line);
    border-radius:var(--radius);
    margin-bottom:14px;
    overflow:hidden;
  }
  .section-head{
    display:flex; align-items:center; gap:12px;
    padding:16px 16px;
    cursor:pointer;
    user-select:none;
  }
  .section-num{
    font-family:'JetBrains Mono',monospace;
    font-size:12px;
    color:var(--bg);
    background:var(--accent-dim);
    min-width:34px; height:34px;
    border-radius:8px;
    display:flex; align-items:center; justify-content:center;
    font-weight:700;
    flex-shrink:0;
    transition:background .3s;
  }
  .section.done .section-num{background:var(--accent);}
  .section-title{flex:1; font-weight:600; font-size:15.5px;}
  .section-sub{display:block; font-weight:400; font-size:12.5px; color:var(--text-dim); margin-top:2px;}
  .chevron{color:var(--text-dim); transition:transform .25s; font-size:12px;}
  .section.open .chevron{transform:rotate(180deg);}
  .check-btn{
    width:26px; height:26px; border-radius:7px;
    border:1.5px solid var(--line);
    background:transparent;
    flex-shrink:0;
    cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    color:var(--accent);
    font-size:14px;
  }
  .section.done .check-btn{background:var(--accent); border-color:var(--accent); color:var(--bg);}

  .section-body{
    max-height:0;
    overflow:hidden;
    transition:max-height .35s ease;
    padding:0 16px;
  }
  .section.open .section-body{padding:0 16px 18px;}
  .section-body-inner > *:first-child{margin-top:0;}

  p{color:var(--text); font-size:14.5px;}
  p.dim{color:var(--text-dim); font-size:13.5px;}

  .step{margin-bottom:16px;}
  .step-title{font-weight:600; font-size:14.5px; margin-bottom:6px; color:var(--text);}

  .code-block{
    position:relative;
    background:var(--bg-code);
    border:1px solid var(--line);
    border-radius:8px;
    margin:8px 0;
  }
  .code-block pre{
    margin:0;
    padding:12px 44px 12px 14px;
    overflow-x:auto;
    font-size:13px;
    color:#c9e8a8;
    white-space:pre-wrap;
    word-break:break-word;
  }
  .copy-btn{
    position:absolute; top:8px; right:8px;
    background:var(--bg-card);
    border:1px solid var(--line);
    color:var(--text-dim);
    font-size:11px;
    padding:5px 8px;
    border-radius:6px;
    cursor:pointer;
    font-family:'JetBrains Mono',monospace;
  }
  .copy-btn:hover{color:var(--accent); border-color:var(--accent-dim);}
  .copy-btn.copied{color:var(--accent); border-color:var(--accent);}

  .callout{
    border-radius:8px;
    padding:10px 12px;
    font-size:13.5px;
    margin:10px 0;
    border:1px solid;
  }
  .callout.warn{background:rgba(217,154,61,0.08); border-color:rgba(217,154,61,0.35); color:#e8c07f;}
  .callout.err{background:rgba(193,88,75,0.08); border-color:rgba(193,88,75,0.35); color:#e29b91;}
  .callout.info{background:rgba(139,184,94,0.08); border-color:rgba(139,184,94,0.3); color:#b7d896;}
  .callout b{color:inherit;}

  .expect{
    font-family:'JetBrains Mono',monospace;
    font-size:12.5px;
    color:var(--text-dim);
    margin:6px 0 0;
  }
  .expect .out{color:var(--accent);}

  table{width:100%; border-collapse:collapse; font-size:13px; margin:10px 0;}
  th,td{border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top;}
  th{background:var(--bg-code); color:var(--text-dim); font-weight:600; font-size:12px;}
  td{color:var(--text-dim);}
  td b, td code{color:var(--text);}

  .materials-table a{word-break:break-word;}

  footer{
    max-width:720px; margin:30px auto 0; padding:0 16px;
    color:var(--text-dim); font-size:12.5px; text-align:center;
  }

  ::selection{background:var(--accent-dim); color:#fff;}
</style>
</head>
<body>

<header>
  <div class="prompt-line">uname -m</div>
  <h1>Setup BlockHost di Termux</h1>
  <p class="subtitle">Dari HP kosong sampai panel &amp; website konfirmasi pembayaran jalan berdampingan. Ikuti berurutan — ketuk tiap bagian buat buka langkahnya, dan centang kalau sudah selesai.</p>
</header>

<div class="progress-wrap">
  <div class="progress-label">
    <span id="progress-text">0 / 9 bagian selesai</span>
    <span id="progress-pct">0%</span>
  </div>
  <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
</div>

<main id="sections"></main>

<footer>Progres kamu tersimpan otomatis di HP ini. Kalau macet, cek bagian Troubleshooting di paling bawah.</footer>

<script>
const DATA = [
{
  title:"Bahan yang perlu didownload",
  sub:"Kumpulan link resmi sebelum mulai",
  html:`
  <div class="callout warn"><b>Wajib dibaca duluan:</b> HP Android CPU-nya ARM64 (aarch64), bukan x86_64 (itu buat laptop/PC). Kalau salah download versi x86_64, nanti muncul <code>cannot execute binary file: Exec format error</code>. Selalu cek dulu dengan <code>uname -m</code> sebelum download binary apa pun.</div>
  <table class="materials-table">
    <tr><th>Bahan</th><th>Untuk apa</th><th>Link</th></tr>
    <tr><td><b>Termux</b></td><td>Aplikasi terminal tempat semua langkah dijalankan</td><td><a href="https://f-droid.org/packages/com.termux/" target="_blank">F-Droid</a> (disarankan) atau GitHub Releases</td></tr>
    <tr><td><b>PHP Binary Android</b> (PocketMineMP)</td><td>Menjalankan mesin server Minecraft</td><td><a href="https://github.com/pmmp/PHP-Binaries/releases" target="_blank">github.com/pmmp/PHP-Binaries</a> — pilih <code>Android-arm64</code>, JANGAN <code>x86_64</code></td></tr>
    <tr><td><b>PocketMineMP.phar</b></td><td>Software server Minecraft Bedrock</td><td><a href="https://github.com/pmmp/PocketMine-MP/releases/latest" target="_blank">github.com/pmmp/PocketMine-MP</a></td></tr>
    <tr><td><b>BlockHost.zip</b></td><td>Source code panel &amp; website konfirmasi pembayaran</td><td>Bukan dari GitHub — punya kamu sendiri, dikirim manual</td></tr>
    <tr><td><b>ngrok</b> (opsional, Bagian 8)</td><td>Supaya panel bisa diakses dari internet</td><td><a href="https://ngrok.com/download/linux" target="_blank">ngrok.com/download/linux</a></td></tr>
    <tr><td><b>proot</b> (opsional, Bagian 8)</td><td>Trik supaya ngrok bisa baca DNS di Termux</td><td><code>pkg install proot</code>, nggak perlu download manual</td></tr>
  </table>
  <p class="dim">Node.js dan Git nggak perlu didownload manual — otomatis lewat <code>pkg install nodejs git</code> di Bagian 1.3.</p>
  `
},
{
  title:"Install & siapkan Termux",
  sub:"F-Droid, update paket, Node.js, Git",
  html:`
  <div class="step">
    <div class="step-title">1.1 Install Termux dari F-Droid (bukan Play Store)</div>
    <p class="dim">Versi Termux di Play Store sudah lama nggak diupdate dan sering bermasalah.</p>
    <p>Buka <a href="https://f-droid.org/packages/com.termux/" target="_blank">f-droid.org/packages/com.termux</a>, download APK-nya, install (kalau muncul peringatan "sumber tidak dikenal", izinkan), lalu buka aplikasi Termux.</p>
  </div>
  <div class="step">
    <div class="step-title">1.2 Update paket & izinkan akses storage</div>
    ${codeBlock("pkg update && pkg upgrade -y\ntermux-setup-storage")}
    <p class="dim">Saat muncul dialog izin, tap Allow/Izinkan. Kalau muncul pesan "directory sudah ada, mau rebuild?", ketik <code>y</code> lalu Enter.</p>
  </div>
  <div class="step">
    <div class="step-title">1.3 Install Node.js dan Git</div>
    ${codeBlock("pkg install nodejs git -y")}
    <div class="step-title" style="margin-top:10px;">Cek berhasil</div>
    ${codeBlock("node -v")}
    <p class="expect">Harus muncul nomor versi, misal <span class="out">v26.4.0</span>. Kalau muncul <code>command not found</code>, ulangi langkah 1.3.</p>
  </div>
  `
},
{
  title:"Pindahkan folder BlockHost ke Termux",
  sub:"Ekstrak langsung dari Termux",
  html:`
  <p class="dim">Cara paling gampang & paling jarang gagal: ekstrak langsung dari Termux, nggak perlu buka file manager sama sekali.</p>
  <div class="step">
    <div class="step-title">2.1 Install unzip</div>
    ${codeBlock("pkg install unzip -y")}
  </div>
  <div class="step">
    <div class="step-title">2.2 Cek nama file BlockHost.zip persis di folder Download</div>
    ${codeBlock("ls ~/storage/downloads/ | grep -i blockhost")}
    <p class="dim">Catat nama file persisnya. Kadang ada tambahan seperti <code>(1)</code> kalau download dobel.</p>
  </div>
  <div class="step">
    <div class="step-title">2.3 Ekstrak</div>
    ${codeBlock("cd ~\nunzip ~/storage/downloads/BlockHost.zip")}
    <p class="dim">Kalau nama filenya beda dari hasil 2.2, ganti <code>BlockHost.zip</code> di atas sesuai nama aslinya.</p>
  </div>
  <div class="step">
    <div class="step-title">2.4 Cek hasilnya</div>
    ${codeBlock("ls ~/BlockHost")}
    <p class="expect">Harus muncul: <span class="out">Host-Minecraft-final</span> dan <span class="out">paymentconfirm</span>.</p>
  </div>
  `
},
{
  title:"Siapkan PHP & PocketMineMP",
  sub:"Mesin server Minecraft — bagian paling gampang salah",
  html:`
  <p class="dim">Panel BlockHost cuma jadi "remote control" — mesin Minecraft-nya sendiri pakai PocketMine-MP yang jalan lewat PHP. Dua file ini sengaja nggak dimasukkan ke zip karena ukurannya besar.</p>
  <div class="step">
    <div class="step-title">3.1 Cek arsitektur CPU HP kamu dulu (WAJIB, jangan skip)</div>
    ${codeBlock("uname -m")}
    <p class="expect">Hampir pasti hasilnya <span class="out">aarch64</span> (artinya ARM64). Ingat-ingat hasil ini untuk langkah 3.2.</p>
    <div class="callout err"><b>Kalau asal download versi x86_64</b> atau Linux biasa (tanpa keterangan Android/arm64), nanti muncul: <code>bash: ./php: cannot execute binary file: Exec format error</code>. Itu tandanya salah download versi.</div>
  </div>
  <div class="step">
    <div class="step-title">3.2 Masuk ke folder pocketmine</div>
    ${codeBlock("cd ~/BlockHost/Host-Minecraft-final/pocketmine")}
  </div>
  <div class="step">
    <div class="step-title">3.3 Download binary PHP khusus PocketMine-MP</div>
    <p>Buka <a href="https://github.com/pmmp/PHP-Binaries/releases" target="_blank">github.com/pmmp/PHP-Binaries/releases</a>, cari rilis yang ditandai ✅ "recommended", pilih file yang namanya mengandung <code>Android-arm64</code> (contoh: <code>PHP-8.2-Android-arm64-PM5.tar.gz</code>) — jangan yang ada tulisan <code>x86_64</code>. Download (otomatis masuk folder Download HP).</p>
  </div>
  <div class="step">
    <div class="step-title">3.4 Bersihkan sisa percobaan sebelumnya (kalau ada)</div>
    ${codeBlock("rm -rf bin php")}
  </div>
  <div class="step">
    <div class="step-title">3.5 Ekstrak file PHP yang benar</div>
    ${codeBlock("tar -xzf ~/storage/downloads/NAMA-FILE-PHP-ARM64.tar.gz")}
    <p class="dim">Ganti <code>NAMA-FILE-PHP-ARM64.tar.gz</code> dengan nama file persis hasil 3.3 — cek dengan <code>ls ~/storage/downloads/</code> kalau lupa.</p>
  </div>
  <div class="step">
    <div class="step-title">3.6 Cari & salin file php ke lokasi yang benar</div>
    ${codeBlock('find . -iname php -type f -not -path "./php" -exec cp {} ./php \\;')}
  </div>
  <div class="step">
    <div class="step-title">3.7 Jadikan bisa dijalankan (executable)</div>
    ${codeBlock("chmod +x ./php")}
  </div>
  <div class="step">
    <div class="step-title">3.8 Tes</div>
    ${codeBlock("./php -v")}
    <p class="expect">Harus muncul info versi PHP, misal <span class="out">PHP 8.2.x</span>, bukan error. Kalau masih <code>Exec format error</code>, file di 3.3 masih salah arsitektur — ulangi, pastikan pilih <code>Android-arm64</code>.</p>
  </div>
  <div class="step">
    <div class="step-title">3.9 Download PocketMine-MP.phar</div>
    <p class="dim">Masih di folder yang sama (<code>~/BlockHost/Host-Minecraft-final/pocketmine</code>):</p>
    ${codeBlock("curl -L -o PocketMine-MP.phar https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar")}
    ${codeBlock("ls -lh PocketMine-MP.phar")}
  </div>
  <div class="step">
    <div class="step-title">3.10 Jalankan PocketMine-MP sekali secara MANUAL (wajib)</div>
    <p class="dim">Ini wajib dilakukan sebelum pakai panel, supaya server pertama kali di-setup (nama server, terima EULA, dll).</p>
    ${codeBlock("./php PocketMine-MP.phar")}
    <p class="dim">Ikuti semua pertanyaan yang muncul (bahasa, nama server, dsb) sampai muncul:</p>
    <p class="expect"><span class="out">Done (...)! For help, type "help" or "?"</span></p>
    <p class="dim">Itu tandanya server sudah nyala sukses. Sekarang matikan dulu supaya bisa lanjut ke panel:</p>
    ${codeBlock("stop")}
    <p class="dim">Tunggu sampai proses berhenti total dan kembali ke prompt Termux biasa.</p>
  </div>
  `
},
{
  title:"Jalankan panel BlockHost",
  sub:"node server.js → buka di browser",
  html:`
  <div class="step">
    <div class="step-title">4.1 Pindah ke folder panel</div>
    ${codeBlock("cd ~/BlockHost/Host-Minecraft-final")}
  </div>
  <div class="step">
    <div class="step-title">4.2 Jalankan</div>
    ${codeBlock("node server.js")}
    <p class="expect">Kalau berhasil, muncul: <span class="out">BlockHost backend jalan di http://0.0.0.0:3000</span></p>
    <div class="callout info">Jangan tutup Termux — minimize saja (tombol Home HP), biarkan tetap jalan di background.</div>
  </div>
  <div class="step">
    <div class="step-title">4.3 Buka panel di browser</div>
    <p>Di browser HP yang sama, buka <code>http://localhost:3000</code>. Daftar akun baru lewat tombol DAFTAR, lalu pilih paket. Dari sini kamu bisa START/STOP server Minecraft, kelola pemain, plugin, backup, add-on, map, dll — semua lewat panel.</p>
  </div>
  `
},
{
  title:"Website konfirmasi pembayaran",
  sub:"Opsional tapi disarankan — server terpisah",
  html:`
  <p class="dim">Ini server terpisah, harus dijalankan di sesi Termux yang berbeda supaya bisa jalan bareng panel.</p>
  <div class="step">
    <div class="step-title">5.1 Buka sesi Termux baru</div>
    <p>Swipe dari tepi kiri layar ke kanan, atau tap ikon garis tiga di pojok kiri atas, lalu tap <b>New session</b>. Ini buka jendela Termux baru, terpisah dari yang menjalankan panel (Bagian 4 tetap jalan di background).</p>
  </div>
  <div class="step">
    <div class="step-title">5.2 Pindah ke folder payment-confirm</div>
    ${codeBlock("cd ~/BlockHost/payment-confirm")}
  </div>
  <div class="step">
    <div class="step-title">5.3 Jalankan</div>
    ${codeBlock("node server.js")}
    <p class="expect">Kalau berhasil, muncul: <span class="out">payment-confirm jalan di http://0.0.0.0:3001</span></p>
  </div>
  <div class="step">
    <div class="step-title">5.4 Akses form pembayaran & halaman admin</div>
    <p>Form untuk user mengisi konfirmasi transfer: <code>http://localhost:3001</code> (atau lewat panel di <code>http://localhost:3000/bayar</code>)</p>
    <p>Halaman admin (kamu) untuk konfirmasi/tolak pembayaran: <code>http://localhost:3001/admin.html</code></p>
    <div class="callout warn">Password admin: <code>TAMAEL999</code></div>
  </div>
  `
},
{
  title:"Supaya Termux nggak mati sendiri",
  sub:"Baterai & wake-lock",
  html:`
  <p class="dim">Android sering "membunuh" aplikasi background untuk hemat baterai, termasuk Termux yang lagi jalanin server. Supaya server tetap hidup walau layar HP dikunci:</p>
  <div class="step">
    <div class="step-title">1. Matikan optimasi baterai untuk Termux</div>
    <p>Pengaturan HP → Aplikasi → Termux → Baterai → matikan Optimasi baterai / pilih <b>Tidak dibatasi (Unrestricted)</b>.</p>
  </div>
  <div class="step">
    <div class="step-title">2. Sebelum menjalankan server, jalankan dulu</div>
    ${codeBlock("termux-wake-lock")}
    <p class="dim">Ini mencegah HP tidur total selagi Termux aktif.</p>
  </div>
  `
},
{
  title:"Akses dari HP/PC lain (satu WiFi)",
  sub:"Cek IP lokal HP",
  html:`
  ${codeBlock("ip addr show wlan0 | grep inet")}
  <p>Cari angka setelah <code>inet</code> (contoh: <code>192.168.1.5</code>). Lalu dari HP/PC lain di WiFi yang sama, ganti <code>localhost</code> dengan IP itu, buka misalnya <code>http://192.168.1.5:3000</code>.</p>
  `
},
{
  title:"Akses dari internet dengan ngrok",
  sub:"Opsional — bagikan panel ke luar WiFi rumah",
  html:`
  <p class="dim">Bagian 7 cuma bikin panel bisa diakses HP/PC lain dalam satu WiFi. Kalau mau diakses dari mana saja (misal dibagikan ke pelanggan), pakai ngrok untuk bikin alamat publik yang tembus internet.</p>
  <div class="step">
    <div class="step-title">8.1 Buat folder ngrok</div>
    ${codeBlock("mkdir -p ~/ngrok-bin")}
  </div>
  <div class="step">
    <div class="step-title">8.2 Download ngrok</div>
    <p>Buka <a href="https://ngrok.com/download/linux" target="_blank">ngrok.com/download/linux</a>, pilih arsitektur ARM64, download file <code>.tar.gz</code>-nya.</p>
  </div>
  <div class="step">
    <div class="step-title">8.3 Ekstrak ke folder ngrok-bin</div>
    ${codeBlock("tar -xzf ~/storage/downloads/NAMA-FILE-NGROK.tar.gz -C ~/ngrok-bin")}
  </div>
  <div class="step">
    <div class="step-title">8.4 Masuk folder & jadikan executable</div>
    ${codeBlock("cd ~/ngrok-bin\nchmod +x ngrok\n./ngrok version")}
  </div>
  <div class="step">
    <div class="step-title">8.5 Daftar akun & ambil authtoken</div>
    <p>Daftar akun gratis di <a href="https://ngrok.com" target="_blank">ngrok.com</a>, buka <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank">dashboard.ngrok.com/getstarted/your-authtoken</a>, copy token-nya.</p>
    <div class="callout err">Jangan pernah screenshot/share token ini ke orang lain — siapa saja yang pegang token ini bisa bajak tunnel kamu.</div>
