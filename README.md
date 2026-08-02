# Tutorial Lengkap Setup BlockHost di Termux

Panduan ini dimulai dari HP kosong (belum ada apa-apa) sampai panel BlockHost dan
website konfirmasi pembayaran jalan berdampingan, plus opsional bisa diakses dari
internet. Ikuti berurutan, jangan ada yang dilewat. Tiap perintah ada di kotak
kodenya sendiri-sendiri supaya gampang disalin satu-satu.

---

## Bahan yang Perlu Didownload

Kumpulan semua link resmi yang dibutuhkan sepanjang panduan ini:

| Bahan | Untuk apa | Link download |
|---|---|---|
| **Termux** | Aplikasi terminal tempat semua langkah ini dijalankan | [F-Droid](https://f-droid.org/packages/com.termux/) (disarankan) atau [GitHub Releases](https://github.com/termux/termux-app/releases) |
| **PHP Binary khusus Android** | Menjalankan mesin server Minecraft (PocketMine-MP) | [github.com/pmmp/PHP-Binaries/releases](https://github.com/pmmp/PHP-Binaries/releases) — **pilih yang namanya mengandung `Android-arm64`**, JANGAN yang `x86_64` (lihat peringatan di Bagian 3) |
| **PocketMine-MP.phar** | Software server Minecraft Bedrock itu sendiri | [github.com/pmmp/PocketMine-MP/releases/latest](https://github.com/pmmp/PocketMine-MP/releases/latest) |
| **BlockHost.zip** (panel + payment-confirm) | Source code panel & website konfirmasi pembayaran | Bukan dari GitHub — punya kamu sendiri, dikirim manual |
| **ngrok** (opsional, Bagian 8) | Supaya panel bisa diakses dari internet, bukan cuma WiFi rumah | [ngrok.com/download/linux](https://ngrok.com/download/linux) — **ngrok bukan open-source, tidak ada di GitHub**, ini link resmi satu-satunya |
| **proot** (opsional, Bagian 8) | Trik supaya ngrok bisa baca DNS di Termux | `pkg install proot`, tidak perlu download manual |

Node.js dan Git tidak perlu didownload manual — otomatis lewat `pkg install nodejs git`
di Bagian 1.3.

> ⚠️ **Pelajaran penting:** HP Android itu CPU-nya **ARM64 (aarch64)**, bukan x86_64
> (itu buat laptop/PC Intel-AMD). Kalau salah download versi x86_64, nanti muncul error
> `cannot execute binary file: Exec format error`. Selalu cek dulu dengan `uname -m`
> sebelum download binary apa pun (dijelaskan lebih detail di Bagian 3.2).

---

## BAGIAN 1 — Install & Siapkan Termux

### 1.1 Install Termux dari F-Droid (bukan Play Store)
Versi Termux di Play Store sudah lama tidak diupdate dan sering bermasalah.

1. Buka browser di HP, buka: `https://f-droid.org/packages/com.termux/`
2. Download APK-nya, install (kalau muncul peringatan "sumber tidak dikenal", izinkan)
3. Buka aplikasi Termux

### 1.2 Update paket & izinkan akses storage

```
pkg update && pkg upgrade -y
```

```
termux-setup-storage
```
Saat muncul dialog izin, tap **Allow/Izinkan**. Kalau muncul pesan "directory sudah
ada, mau rebuild?", ketik `y` lalu Enter.

### 1.3 Install Node.js dan Git

```
pkg install nodejs git -y
```

Cek berhasil:
```
node -v
```
Harus muncul nomor versi (misal `v26.4.0`). Kalau muncul `command not found`, ulangi
langkah 1.3.

---

## BAGIAN 2 — Pindahkan Folder BlockHost ke Termux

Cara paling gampang & paling jarang gagal: ekstrak langsung dari Termux, tidak perlu
buka file manager sama sekali.

### 2.1 Install unzip

```
pkg install unzip -y
```

### 2.2 Cek nama file BlockHost.zip persis di folder Download

```
ls ~/storage/downloads/ | grep -i blockhost
```
Catat nama file persisnya yang muncul (kadang ada tambahan seperti `(1)` kalau
download dobel).

### 2.3 Ekstrak

```
cd ~
```

```
unzip ~/storage/downloads/BlockHost.zip
```
(Kalau nama filenya beda dari hasil 2.2, ganti `BlockHost.zip` di atas sesuai nama
aslinya.)

### 2.4 Cek hasilnya

```
ls ~/BlockHost
```
Harus muncul: `Host-Minecraft-final` dan `payment-confirm`.

---

## BAGIAN 3 — Siapkan PHP & PocketMine-MP (mesin server Minecraft)

Panel BlockHost cuma jadi "remote control" — mesin Minecraft-nya sendiri pakai
PocketMine-MP yang jalan lewat PHP. Dua file ini **sengaja tidak dimasukkan ke dalam
zip** karena ukurannya besar, jadi perlu didownload manual sekali di sini.

### 3.1 Cek arsitektur CPU HP kamu dulu (WAJIB, jangan skip)

```
uname -m
```
Hampir pasti hasilnya `aarch64` (artinya ARM64). Ingat-ingat hasil ini untuk langkah
3.2.

> ⚠️ Kalau kamu asal download binary PHP yang dilabeli **x86_64** atau **Linux** biasa
> (tanpa keterangan Android/arm64), nanti pas dijalankan muncul error:
> `bash: ./php: cannot execute binary file: Exec format error`
> Itu tandanya salah download versi. Harus diulang dengan versi yang benar di bawah.

### 3.2 Masuk ke folder pocketmine

```
cd ~/BlockHost/Host-Minecraft-final/pocketmine
```

### 3.3 Download binary PHP khusus PocketMine-MP

1. Buka browser HP, buka: `https://github.com/pmmp/PHP-Binaries/releases`
2. Cari rilis yang direkomendasikan (biasanya ditandai ✅ "recommended")
3. Pilih file yang namanya mengandung **`Android-arm64`** (contoh nama yang terbukti
   jalan: `PHP-8.2-Android-arm64-PM5.tar.gz`) — **jangan** yang ada tulisan `x86_64`
4. Download file itu (otomatis masuk ke folder Download HP)

### 3.4 Bersihkan sisa percobaan sebelumnya (kalau ada)

```
rm -rf bin php
```

### 3.5 Ekstrak file PHP yang benar

```
tar -xzf ~/storage/downloads/NAMA-FILE-PHP-ARM64.tar.gz
```
(Ganti `NAMA-FILE-PHP-ARM64.tar.gz` dengan nama file persis yang kamu download di
3.3 — cek dengan `ls ~/storage/downloads/` kalau lupa nama persisnya.)

### 3.6 Cari & salin file php ke lokasi yang benar

```
find . -iname php -type f -not -path "./php" -exec cp {} ./php \;
```

### 3.7 Jadikan bisa dijalankan (executable)

```
chmod +x ./php
```

### 3.8 Tes

```
./php -v
```
Harus muncul info versi PHP (misal `PHP 8.2.x`), bukan error. Kalau masih muncul
`Exec format error`, berarti file yang didownload di 3.3 masih salah arsitektur —
ulangi dari 3.3, pastikan pilih yang ada tulisan **Android-arm64**.

### 3.9 Download PocketMine-MP.phar

Masih di folder yang sama (`~/BlockHost/Host-Minecraft-final/pocketmine`):

```
curl -L -o PocketMine-MP.phar https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
```

Cek file-nya ada:
```
ls -lh PocketMine-MP.phar
```

### 3.10 Jalankan PocketMine-MP sekali secara MANUAL (wajib)

Ini WAJIB dilakukan sebelum pakai panel, supaya server pertama kali di-setup (nama
server, terima EULA, dll):

```
./php PocketMine-MP.phar
```

Ikuti semua pertanyaan yang muncul di layar (bahasa, nama server, dsb) sampai muncul
tulisan:
```
Done (...)! For help, type "help" or "?"
```

Itu tandanya server sudah nyala dengan sukses. Sekarang matikan dulu supaya bisa
lanjut ke panel:
```
stop
```
Tunggu sampai proses berhenti total dan kembali ke prompt Termux biasa.

---

## BAGIAN 4 — Jalankan Panel BlockHost

### 4.1 Pindah ke folder panel

```
cd ~/BlockHost/Host-Minecraft-final
```

### 4.2 Jalankan

```
node server.js
```

Kalau berhasil, akan muncul:
```
BlockHost backend jalan di http://0.0.0.0:3000
```

**Jangan tutup Termux** — minimize saja (tombol Home HP), biarkan tetap jalan di
background.

### 4.3 Buka panel di browser

Di browser HP yang sama, buka:
```
http://localhost:3000
```

Daftar akun baru lewat tombol **DAFTAR**, lalu pilih paket. Dari sini kamu bisa
START/STOP server Minecraft, kelola pemain, plugin, backup, add-on, map, dll — semua
lewat panel.

---

## BAGIAN 5 — Jalankan Website Konfirmasi Pembayaran (opsional tapi disarankan)

Ini server **terpisah**, harus dijalankan di sesi Termux yang berbeda supaya bisa
jalan bareng dengan panel.

### 5.1 Buka sesi Termux baru
Di Termux, buka menu sesi (swipe dari tepi kiri layar ke kanan, atau tap ikon garis
tiga di pojok kiri atas), lalu tap **New session**. Ini akan buka jendela Termux baru,
terpisah dari yang menjalankan panel (yang di Bagian 4 tetap jalan di background).

### 5.2 Pindah ke folder payment-confirm

```
cd ~/BlockHost/payment-confirm
```

### 5.3 Jalankan

```
node server.js
```

Kalau berhasil, muncul:
```
payment-confirm jalan di http://0.0.0.0:3001
```

### 5.4 Akses form pembayaran & halaman admin

- Form untuk user mengisi konfirmasi transfer: `http://localhost:3001`
  (atau bisa juga diakses lewat panel di `http://localhost:3000/bayar`)
- Halaman admin (kamu) untuk konfirmasi/tolak pembayaran:
  `http://localhost:3001/admin.html`
  Password admin: **TAMAEL999**

---

## BAGIAN 6 — Supaya Termux Tidak Mati Sendiri di Background

Android sering "membunuh" aplikasi background untuk hemat baterai, termasuk Termux
yang lagi jalanin server. Supaya server tetap hidup walau layar HP dikunci:

1. Buka **Pengaturan HP** → **Aplikasi** → **Termux** → **Baterai**
2. Matikan **Optimasi baterai** / pilih **Tidak dibatasi (Unrestricted)**
3. Sebelum menjalankan server, jalankan dulu di Termux:
   ```
   termux-wake-lock
   ```
   Ini mencegah HP tidur total selagi Termux aktif.

---

## BAGIAN 7 — Akses dari HP/PC Lain (dalam satu WiFi)

Cek IP lokal HP:
```
ip addr show wlan0 | grep inet
```
Cari angka setelah `inet` (contoh: `192.168.1.5`). Lalu dari HP/PC lain di WiFi yang
sama, ganti `localhost` dengan IP itu, buka:
```
http://192.168.1.5:3000
```

---

## BAGIAN 8 — Akses dari Internet dengan ngrok (opsional)

Bagian 7 cuma bikin panel bisa diakses HP/PC lain **dalam satu WiFi**. Kalau mau panel
diakses dari **mana saja** (misal dibagikan ke pelanggan), pakai ngrok untuk bikin
alamat publik yang tembus internet.

### 8.1 Buat folder ngrok

```
mkdir -p ~/ngrok-bin
```

### 8.2 Download ngrok

1. Buka browser HP, ke: `https://ngrok.com/download/linux`
2. Pilih arsitektur **ARM64**, download file `.tar.gz`-nya

### 8.3 Ekstrak ke folder ngrok-bin

```
tar -xzf ~/storage/downloads/NAMA-FILE-NGROK.tar.gz -C ~/ngrok-bin
```
(Ganti `NAMA-FILE-NGROK.tar.gz` sesuai nama file yang benar-benar kamu download.)

### 8.4 Masuk folder & jadikan executable

```
cd ~/ngrok-bin
```

```
chmod +x ngrok
```

```
./ngrok version
```

### 8.5 Daftar akun & ambil authtoken

1. Buka `https://ngrok.com`, daftar akun gratis
2. Buka `https://dashboard.ngrok.com/get-started/your-authtoken`, copy token-nya
3. **Jangan pernah screenshot/share token ini ke orang lain** — siapa saja yang
   pegang token ini bisa bajak tunnel kamu

### 8.6 Buat folder config & simpan token

```
mkdir -p ~/.ngrok-config
```

```
./ngrok config add-authtoken TOKEN_NGROK_KAMU --config ~/.ngrok-config/ngrok.yml
```
(Ganti `TOKEN_NGROK_KAMU` dengan token asli hasil 8.5.)

### 8.7 Tambahkan daftar tunnel ke file config

Tempel **satu blok ini sekaligus** (dari baris `cat >` sampai `EOF` di paling bawah) —
ini akan menimpa isi file config dengan token asli kamu + 2 tunnel (panel & pembayaran):

```
cat > ~/.ngrok-config/ngrok.yml << 'EOF'
version: 3
agent:
  authtoken: TOKEN_NGROK_KAMU
tunnels:
  panel:
    proto: http
    addr: 3000
  pembayaran:
    proto: http
    addr: 3001
EOF
```
(Ganti `TOKEN_NGROK_KAMU` di dalam blok itu dengan token asli kamu sebelum ditempel.)

> ⚠️ **Kesalahan paling sering:** jangan tulis `proto: http://localhost:3000`.
> `proto` isinya cuma `http` doang, port-nya taruh terpisah di `addr`. Kalau salah,
> muncul error `YAML parsing error: Invalid protocol name`.

### 8.8 Kenapa perlu `proot` (jangan skip ini)

Kalau langsung dijalankan, biasanya muncul error `reconnecting (failed to dial ngrok
server...)`. Penyebabnya: `ngrok` adalah program Go yang di-compile statis, dan
program seperti ini **tidak** ikut dapat "penerjemah path" otomatis yang biasa dipakai
Termux untuk program lain. Akibatnya `ngrok` mencoba baca file `/etc/resolv.conf`
versi asli Android — yang memang tidak pernah ada dan tidak bisa ditulis (read-only,
bahkan `mount`/`remount` diblokir sistem Android meski sudah root, muncul error
`Bad system call`).

Solusinya: bungkus `ngrok` pakai `proot`, supaya dia "ditipu" seolah-olah
`/etc/resolv.conf` ada isinya.

```
pkg install proot -y
```

```
mkdir -p ~/fakeetc
```

```
echo "nameserver 1.1.1.1" > ~/fakeetc/resolv.conf
```

```
echo "nameserver 8.8.8.8" >> ~/fakeetc/resolv.conf
```

Cek isinya sudah benar (harus muncul 2 baris nameserver):
```
cat ~/fakeetc/resolv.conf
```

### 8.9 Jalankan ngrok

```
cd ~/ngrok-bin
```

```
proot -b ~/fakeetc/resolv.conf:/etc/resolv.conf ./ngrok start --all --config ~/.ngrok-config/ngrok.yml
```

Kalau berhasil, muncul `Session Status: online` dan baris **Forwarding** dengan alamat
`https://xxxxx.ngrok-free.dev`. Itu alamat publiknya.

### 8.10 Keterbatasan akun gratis (penting, belum final)

Akun ngrok gratis **cuma boleh 1 alamat publik aktif** dalam satu waktu — walau
dikonfigurasi 2 tunnel (`panel` & `pembayaran`), yang benar-benar aktif cuma satu, dan
dua-duanya kelihatan share URL yang sama persis (jadi buka URL "pembayaran" malah
nyasar ke panel). Dua opsi solusi yang tersedia, belum dipilih/dipasang final:

- **Opsi A:** jalankan tunnel kedua pakai `cloudflared` (Cloudflare Tunnel, gratis,
  tanpa limit jumlah tunnel) khusus untuk port 3001, jadi panel & pembayaran dapat 2
  alamat publik terpisah.
- **Opsi B:** ubah `server.js` panel supaya jadi reverse-proxy — akses
  `https://url-ngrok/payment` diteruskan otomatis ke payment-confirm secara internal,
  jadi cukup 1 alamat publik untuk dua-duanya, tanpa tool tambahan.

*(Update bagian ini setelah salah satu opsi dipasang final.)*

---

## BAGIAN 9 — Ringkasan Urutan Menjalankan (setelah setup awal selesai)

Setiap kali mau menyalakan semuanya dari awal (misal setelah HP restart), urutannya:

```
termux-wake-lock
```

```
cd ~/BlockHost/Host-Minecraft-final
```

```
node server.js
```

→ buka sesi Termux baru →

```
cd ~/BlockHost/payment-confirm
```

```
node server.js
```

Lalu buka `http://localhost:3000` di browser (dalam WiFi yang sama).

**Kalau mau diakses dari internet:** buka sesi Termux baru lagi, lalu:

```
cd ~/ngrok-bin
```

```
proot -b ~/fakeetc/resolv.conf:/etc/resolv.conf ./ngrok start --all --config ~/.ngrok-config/ngrok.yml
```

---

## Troubleshooting Cepat

| Masalah | Penyebab & Solusi |
|---|---|
| `bash: ./php: No such file or directory` | Kamu belum di folder `pocketmine`, atau file `php` belum ada/belum di-download. Cek dengan `ls`. |
| `bash: ./php: cannot execute binary file: Exec format error` | Salah download arsitektur — kamu download versi x86_64 padahal HP Android pakai ARM64. Cek `uname -m`, lalu ulangi Bagian 3.3 dan pilih file yang ada tulisan `Android-arm64`. |
| `Permission denied` saat `./php` | Lupa `chmod +x php`. Jalankan itu dulu. |
| `cp: cannot stat '...': No such file or directory` | Nama file/folder yang diketik beda dengan yang sebenarnya ada di HP (typo, huruf besar/kecil, atau memang belum didownload/diekstrak). Cek dulu dengan `ls ~/storage/downloads/`. |
| `EADDRINUSE` / port sudah dipakai | Server sudah jalan di sesi lain. Cek sesi Termux lain, atau `pkill -f "node server.js"` lalu jalankan ulang. |
| Panel bisa dibuka tapi START server gagal | PocketMine-MP belum pernah dijalankan manual (lewati Bagian 3.10). |
| `payment-confirm` error "tidak menemukan Host-Minecraft-final" | Pastikan folder `payment-confirm` dan `Host-Minecraft-final` **sejajar** (sama-sama langsung di dalam folder `BlockHost`), jangan dipindah-pindah terpisah. |
| Server mati sendiri saat layar dikunci | Lakukan Bagian 6 (matikan optimasi baterai + `termux-wake-lock`). |
| `YAML parsing error: Invalid protocol name` | Salah nulis `proto` di `ngrok.yml` — isinya harus cuma `http`, port taruh terpisah di `addr`. Lihat Bagian 8.7. |
| `reconnecting (failed to dial ngrok server...)` | Biasanya bukan masalah internet, tapi DNS di Android. Jalankan `ngrok` lewat `proot` seperti Bagian 8.8–8.9. |
| `SIGSYS: bad system call` saat `ngrok diagnose` | Bug kompatibilitas Go+Android (bukan salah kamu). Jangan pakai `ngrok diagnose`, langsung ke fix `proot` di Bagian 8.8. |
| `/etc/resolv.conf: Read-only file system` / `No such file or directory` | Normal — path sistem Android itu dikunci. Jangan coba `mount`/`remount`, langsung pakai trik `proot` di Bagian 8.8. |
| Buka URL "pembayaran" tapi nyasar ke panel | Akun ngrok gratis cuma 1 endpoint aktif. Lihat Bagian 8.10 untuk pilihan solusinya. |
