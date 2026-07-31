# Setup BlockHost di HP (Android + Termux)

Jujur di awal: server aslinya bukan `bedrock_server` resmi Mojang (itu tidak jalan di HP), tapi **PocketMine-MP** — software pihak ketiga yang meniru protokol Bedrock. Pemain tetap connect pakai Minecraft Bedrock biasa seperti ke server asli.

Syarat: HP Android, RAM disarankan **4GB+** biar lancar, dan WiFi rumah (sudah kamu punya ✅).

## 1. Install Termux
Install dari **F-Droid**, BUKAN Play Store (versi Play Store sudah tidak di-update):
- https://f-droid.org/packages/com.termux/

## 2. Siapkan Termux
Buka Termux, jalankan satu-satu:
```
pkg update && pkg upgrade -y
termux-setup-storage
pkg install nodejs git -y
```

## 3. Ambil file panel BlockHost
Cara termudah: upload folder `blockhost` ini ke repo GitHub kamu sendiri, lalu di Termux:
```
git clone https://github.com/USERNAME/NAMA_REPO.git blockhost
cd blockhost
```
(Atau pindahkan manual lewat kabel data / Google Drive ke folder `~/blockhost`.)

## 4. Pasang PHP untuk PocketMine-MP
PocketMine-MP butuh build PHP khusus (bukan `pkg install php` biasa). Di dalam folder `blockhost`:
```
mkdir pocketmine && cd pocketmine
curl -L -o php https://github.com/pmmp/PHP-Binary/releases/latest/download/PHP-Linux-arm64.tar.gz
```
> Nama file rilis di halaman itu bisa berubah — buka https://github.com/pmmp/PHP-Binary/releases dari browser HP, cari file untuk **arm64/Linux**, unduh, lalu ekstrak isinya (`bin/php`) ke `blockhost/pocketmine/php`, lalu:
```
chmod +x php
```

## 5. Unduh PocketMine-MP
Masih di folder `blockhost/pocketmine`:
```
curl -L -O https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
```

## 6. Jalankan sekali manual dulu (penting!)
Sebelum pakai panel, jalankan langsung sekali di Termux supaya proses tanya-jawab awal (nama server, mode, dan persetujuan EULA Minecraft) selesai:
```
./php PocketMine-MP.phar
```
Ikuti pertanyaannya sampai server nyala. Setelah itu, `Ctrl+C` dua kali untuk berhenti. Konfigurasi tersimpan otomatis — mulai sekarang panel BlockHost yang akan menyalakan/mematikannya.

## 7. Jalankan backend panel
Kembali ke folder utama:
```
cd ~/blockhost
node server.js
```
Biarkan Termux tetap terbuka (jangan di-*swipe close*).

## 8. Buka panel
- Dari browser HP itu sendiri: `http://localhost:3000`
- Dari HP/laptop lain yang nyambung WiFi sama: cari IP lokal HP dengan `ifconfig` (biasanya `192.168.x.x`), lalu buka `http://192.168.x.x:3000`

## 9. Supaya tidak mati saat layar dikunci
- Di Pengaturan Android → Baterai → cari Termux → matikan "Optimasi baterai"
- Jalankan `termux-wake-lock` di Termux sebelum `node server.js`
- (Opsional) install **Termux:Boot** dari F-Droid biar server auto-jalan setelah HP restart

## 10. Supaya pemain dari luar rumah bisa connect
- Login ke router rumah, cari menu **Port Forwarding**
- Forward port **19132 UDP** ke IP lokal HP kamu
- Sebaiknya set **DHCP reservation** di router untuk HP ini, supaya IP-nya tidak berubah-ubah
- Ini hanya berlaku selama HP di WiFi rumah — kalau pindah ke data seluler, server otomatis tidak bisa diakses dari luar (NAT operator seluler memblokir ini)

## Batasan yang jujur perlu kamu tahu
- PocketMine-MP kadang butuh beberapa hari untuk update ke versi Minecraft Bedrock terbaru
- Tidak semua fitur vanilla 100% identik dengan server resmi
- CPU/RAM di panel sekarang **data asli** dari proses server; TPS tidak ditampilkan sebagai angka palsu karena butuh plugin tambahan untuk diukur akurat
