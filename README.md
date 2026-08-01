# Tutorial Lengkap Setup BlockHost di Termux

Panduan ini dimulai dari HP kosong (belum ada apa-apa) sampai panel BlockHost dan
website konfirmasi pembayaran jalan berdampingan. Ikuti berurutan, jangan ada yang
dilewat.

---

## BAGIAN 1 — Install & Siapkan Termux

### 1.1 Install Termux dari F-Droid (bukan Play Store)
Versi Termux di Play Store sudah lama tidak diupdate dan sering bermasalah.

1. Buka browser di HP, buka: `https://f-droid.org/packages/com.termux/`
2. Download APK-nya, install (kalau muncul peringatan "sumber tidak dikenal", izinkan)
3. Buka aplikasi Termux

### 1.2 Update paket & izinkan akses storage
Ketik satu per satu, tekan Enter setelah masing-masing:

```
pkg update && pkg upgrade -y
```

```
termux-setup-storage
```
Saat muncul dialog izin, tap **Allow/Izinkan**. Kalau muncul pesan "directory sudah ada, mau rebuild?", ketik `y` lalu Enter.

### 1.3 Install Node.js dan Git

```
pkg install nodejs git -y
```

Cek berhasil:
```
node -v
```
Harus muncul nomor versi (misal `v26.4.0`). Kalau muncul `command not found`, ulangi langkah 1.3.

---

## BAGIAN 2 — Pindahkan Folder BlockHost ke Termux

### 2.1 Extract file zip BlockHost
Di file manager HP (bukan Termux), extract `BlockHost.zip` yang saya kirim ke folder
**Download**. Hasil extract-nya berupa folder `BlockHost` yang di dalamnya ada 2 folder:
`Host-Minecraft-final` dan `payment-confirm`.

### 2.2 Salin ke folder home Termux

```
cd ~
cp -r /storage/emulated/0/Download/BlockHost ~/BlockHost
cd ~/BlockHost
ls
```
Harus muncul: `Host-Minecraft-final` dan `payment-confirm`.

> Kalau lokasi extract kamu beda (bukan di folder Download), sesuaikan path di baris
> `cp -r` di atas dengan lokasi sebenarnya.

---

## BAGIAN 3 — Siapkan PHP & PocketMine-MP (mesin server Minecraft)

Panel BlockHost cuma jadi "remote control" — mesin Minecraft-nya sendiri pakai
PocketMine-MP yang jalan lewat PHP. Dua file ini **sengaja tidak saya masukkan ke
dalam zip** karena ukurannya besar, jadi perlu didownload manual sekali di sini.

### 3.1 Masuk ke folder pocketmine

```
cd ~/BlockHost/Host-Minecraft-final/pocketmine
```

### 3.2 Download binary PHP khusus PocketMine-MP

1. Buka browser HP, buka: `https://github.com/pmmp/PHP-Binary/releases`
2. Cari rilis paling atas (terbaru), cari file yang namanya mengandung **arm64** dan
   **linux** (contoh nama: `PHP-8.x-Linux-arm64-PM5.tar.gz`)
3. Download file itu
4. Extract file `.tar.gz` itu (pakai file manager HP, atau lewat Termux — lihat 3.3)

### 3.3 Ekstrak & pindahkan binary PHP lewat Termux

Kalau file hasil download ada di folder Download HP:

```
cd ~/BlockHost/Host-Minecraft-final/pocketmine
tar -xzf /storage/emulated/0/Download/NAMA-FILE-PHP.tar.gz
```
(Ganti `NAMA-FILE-PHP.tar.gz` dengan nama file yang benar-benar kamu download — cek
dengan `ls /storage/emulated/0/Download/` kalau lupa nama persisnya.)

Hasil ekstrak biasanya berupa folder `bin/php`. Pindahkan jadi file `php` langsung di
folder `pocketmine`:

```
find . -name php -type f
```
Command di atas nunjukin lokasi file `php` hasil ekstrak. Kalau lokasinya misalnya di
`./bin/php`, pindahkan:
```
mv ./bin/php ./php
```

Jadikan file itu bisa dijalankan (executable):
```
chmod +x php
```

Cek berhasil:
```
./php --version
```
Harus muncul info versi PHP, bukan error.

### 3.4 Download PocketMine-MP.phar

Masih di folder yang sama (`~/BlockHost/Host-Minecraft-final/pocketmine`):

```
curl -L -o PocketMine-MP.phar https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
```

Cek file-nya ada:
```
ls -lh PocketMine-MP.phar
```

### 3.5 Jalankan PocketMine-MP sekali secara MANUAL (wajib)

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

### 4.1 Pindah ke folder panel dan jalankan

```
cd ~/BlockHost/Host-Minecraft-final
node server.js
```

Kalau berhasil, akan muncul:
```
BlockHost backend jalan di http://0.0.0.0:3000
```

**Jangan tutup Termux** — minimize saja (tombol Home HP), biarkan tetap jalan di
background.

### 4.2 Buka panel di browser

Di browser HP yang sama, buka:
```
http://localhost:3000
```

Daftar akun baru lewat tombol **DAFTAR**, lalu pilih paket. Dari sini kamu bisa
START/STOP server Minecraft, kelola pemain, plugin, backup, dll — semua lewat panel.

---

## BAGIAN 5 — Jalankan Website Konfirmasi Pembayaran (opsional tapi disarankan)

Ini server **terpisah**, harus dijalankan di sesi Termux yang berbeda supaya bisa
jalan bareng dengan panel.

### 5.1 Buka sesi Termux baru
Di Termux, buka menu sesi (swipe dari tepi kiri layar ke kanan, atau tap ikon garis
tiga di pojok kiri atas), lalu tap **New session**. Ini akan buka jendela Termux baru,
terpisah dari yang menjalankan panel (yang di Bagian 4 tetap jalan di background).

### 5.2 Jalankan payment-confirm

Di sesi baru ini:
```
cd ~/BlockHost/payment-confirm
node server.js
```

Kalau berhasil, muncul:
```
payment-confirm jalan di http://0.0.0.0:3001
```

### 5.3 Akses form pembayaran & halaman admin

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

Ganti `localhost` dengan alamat IP lokal HP kamu. Cek IP lokal:
```
ip addr show wlan0 | grep inet
```
Cari angka setelah `inet` (contoh: `192.168.1.5`). Lalu dari HP/PC lain di WiFi yang
sama, buka:
```
http://192.168.1.5:3000
```

---

## BAGIAN 8 — Ringkasan Urutan Menjalankan (setelah setup awal selesai)

Setiap kali mau menyalakan semuanya dari awal (misal setelah HP restart), urutannya:

```
termux-wake-lock
cd ~/BlockHost/Host-Minecraft-final && node server.js
```
→ buka sesi Termux baru →
```
cd ~/BlockHost/payment-confirm && node server.js
```

Lalu buka `http://localhost:3000` di browser.

---

## Troubleshooting Cepat

| Masalah | Penyebab & Solusi |
|---|---|
| `bash: ./php: No such file or directory` | Kamu belum di folder `pocketmine`, atau file `php` belum ada/belum di-download. Cek dengan `ls`. |
| `Permission denied` saat `./php` | Lupa `chmod +x php`. Jalankan itu dulu. |
| `EADDRINUSE` / port sudah dipakai | Server sudah jalan di sesi lain. Cek sesi Termux lain, atau `pkill -f "node server.js"` lalu jalankan ulang. |
| Panel bisa dibuka tapi START server gagal | PocketMine-MP belum pernah dijalankan manual (lewati Bagian 3.5). |
| `payment-confirm` error "tidak menemukan Host-Minecraft-final" | Pastikan folder `payment-confirm` dan `Host-Minecraft-final` **sejajar** (sama-sama langsung di dalam folder `BlockHost`), jangan dipindah-pindah terpisah. |
| Server mati sendiri saat layar dikunci | Lakukan Bagian 6 (matikan optimasi baterai + `termux-wake-lock`). |
