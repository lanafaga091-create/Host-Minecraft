File ini sama persis dengan yang sudah saya berikan sebelumnya. Berikut urutan lengkap cara menjalankannya di Termux, dari nol sampai panel bisa dibuka:
1. Update Termux & install paket dasar
Kode
pkg update && pkg upgrade -y
termux-setup-storage
pkg install nodejs git -y
2. Pindahkan folder ini ke Termux
Extract zip-nya di HP, lalu pindahkan ke Termux (misal dari folder Download):
Kode
cd ~
cp -r /storage/emulated/0/Download/blockhost-1 ~/Host-Minecraft
cd ~/Host-Minecraft
mkdir -p public
mv index.html script.js style.css public/
Kalau file HTML/CSS/JS-nya belum ada di dalam folder public/, pindahkan dulu:
Kode
3. Siapkan PHP khusus untuk PocketMine-MP
Kode
mkdir pocketmine && cd pocketmine
Dari browser HP, buka https://github.com/pmmp/PHP-Binary/releases → cari file untuk arm64/Linux → download → ekstrak → ambil file bin/php dari dalamnya → pindahkan ke folder pocketmine ini dengan nama php. Lalu:
Kode
chmod +x php
4. Download PocketMine-MP
Kode
curl -L -O https://github.com/pmmp/PocketMine-MP/releases/latest/download/PocketMine-MP.phar
5. Jalankan sekali manual (wajib)
Kode
./php PocketMine-MP.phar
Ketik pelan-pelan biar ./ tidak kelewat. Jawab pertanyaan setup (nama server, EULA) sampai server nyala, lalu Ctrl+C dua kali untuk stop.
6. Jalankan panel BlockHost
Kode
cd ~/Host-Minecraft
node server.js
Biarkan Termux tetap terbuka (minimize, jangan swipe close).
7. Buka panel
Di browser HP yang sama:
Kode
http://localhost:3000
Ini sesuai dengan progress kamu sebelumnya — kamu sudah sampai step 5-6 sepertinya. Kalau mau lanjut dari titik terakhir, coba jalankan lagi ./php PocketMine-MP.phar dari folder ~/Host-Minecraft/pocketmine dan kirim screenshot kalau ada error.

Ini errornya wajar — file index.html, script.js, style.css itu sudah ada di dalam folder public/ sejak awal (dari struktur zip aslinya), jadi command mv yang saya kasih tadi gak perlu dijalankan lagi. Kamu sudah otomatis nyalin strukturnya dengan benar lewat cp -r.
Cek dulu untuk pastikan:
Kode
ls public
Kalau hasilnya muncul index.html  script.js  style.css, berarti semuanya sudah pas, tidak perlu mv apa-apa. Skip aja step itu.
Lanjut ke step berikutnya — siapkan PHP:
Kode
mkdir pocketmine && cd pocketmine
Lalu dari browser HP, download PHP arm64 dari:
https://github.com/pmmp/PHP-Binary/releases
Cari file yang namanya mengandung arm64 dan linux, download, ekstrak, ambil file bin/php dari dalamnya, dan pindahkan ke folder ~/Host-Minecraft/pocketmine dengan nama php.
Kalau sudah, jalankan:
Kode
chmod +x php
Coba jalankan ls public dulu dan kirim hasilnya, biar saya pastikan sebelum lanjut ke step PHP.

Errornya karena folder pocketmine sudah ada dari percobaan sebelumnya, jadi mkdir pocketmine && cd pocketmine gagal duanya (mkdir gagal → cd ikut gak jalan karena pakai &&). Makanya kamu masih di folder ~/Host-Minecraft, bukan di ~/Host-Minecraft/pocketmine — itu sebabnya chmod +x php bilang "No such file or directory".
Perbaikannya, jalankan ini:
Kode
cd pocketmine
Lalu cek isinya:
Kode
ls
Ini penting — kasih tau saya hasil ls itu apa aja isinya. Kemungkinan ada 2 skenario:
Skenario A — kalau di dalam folder itu sudah ada php, PocketMine-MP.phar, dll (dari percobaan kamu sebelumnya yang di screenshot lama), berarti tinggal lanjut:
Kode
chmod +x php
./php PocketMine-MP.phar
Skenario B — kalau folder itu kosong atau belum ada file php-nya, berarti perlu download dulu:
Buka https://github.com/pmmp/PHP-Binary/releases dari browser HP
Cari file untuk arm64/Linux, download
Ekstrak, ambil file bin/php, pindahkan ke folder ~/Host-Minecraft/pocketmine dengan nama php
Lalu chmod +x php
Coba jalankan cd pocketmine lalu ls, dan kirim hasilnya ke saya.

Mantap, ini berhasil! 🎉 Server PocketMine-MP kamu sudah nyala dengan sukses:
Done (2.935s)! For help, type "help" or "?" → server sudah jalan dan siap dipakai
Network interface aktif di port 19132 (dan 19133 untuk IPv6)
Game mode default: Survival
Ini adalah proses jalan manual pertama kali (step 5) yang harus dilakukan sebelum pakai panel. Sekarang tinggal lanjut:
1. Stop server ini dulu
Ketik di terminal (bukan pakai tombol CTRL+C, tapi ketik command "stop"):
Kode
stop
Lalu Enter. Tunggu sampai muncul tulisan "Stopping the server" selesai dan kembali ke prompt normal.
2. Balik ke folder utama
Kode
cd ~/Host-Minecraft
3. Jalankan panel BlockHost
Kode
node server.js
4. Buka panel di browser HP
Setelah muncul tulisan BlockHost backend jalan di http://0.0.0.0:3000, minimize Termux (jangan ditutup), lalu buka browser dan akses:
Kode
http://localhost:3000
Dari situ kamu bisa start/stop server Minecraft-nya lewat panel, tanpa perlu ketik command manual lagi.
Kirim screenshot kalau panel-nya sudah kebuka, atau kalau ada error pas jalanin node server.js.
