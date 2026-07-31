function changeBedrockVersion(version){
  showToast(`Versi server diubah ke Bedrock ${version}. Restart server untuk menerapkan.`);
  if(serverState === 'online'){
    consoleLine(`Versi server dijadwalkan berubah ke <span class="tag2">${version}</span> saat restart berikutnya.`);
  }
}

function changeServerSoftware(software){
  const labels = {
    bds: 'Bedrock Dedicated Server (Vanilla) — tanpa dukungan plugin, cuma Add-on resmi.',
    pocketmine: 'PocketMine-MP — mendukung plugin .phar, cocok untuk fitur custom gameplay.',
    nukkit: 'Nukkit — mendukung plugin berbasis Java, performa tinggi untuk server besar.'
  };
  showToast(`Software server diubah ke ${labels[software]} Restart server untuk menerapkan.`);
  if(serverState === 'online'){
    consoleLine(`Software server dijadwalkan berubah ke <span class="tag2">${software}</span> saat restart berikutnya.`);
  }
}

/* ============ LOADER: TNT explosion animation ============ */
const tntBlock = document.getElementById('tntBlock');
const tntFuse = document.getElementById('tntFuse');
const tntSpark = document.getElementById('tntSpark');
const loaderTitle = document.getElementById('loaderTitle');
const pctEl = document.getElementById('loaderPct');
const loaderEl = document.getElementById('loader');
const flashEl = document.getElementById('explosionFlash');

let progress = 0;
tntBlock.classList.add('priming');

const loadInterval = setInterval(()=>{
  progress += Math.random()*8 + 4;
  if(progress >= 100){
    progress = 100;
    clearInterval(loadInterval);
    detonateTNT();
  }
  pctEl.textContent = Math.floor(progress) + '%';

  // fuse burns faster as progress rises
  const wobbleSpeed = Math.max(0.3 - (progress/100)*0.22, 0.08);
  tntBlock.style.animationDuration = wobbleSpeed + 's';
  tntSpark.style.animationDuration = Math.max(0.55 - (progress/100)*0.4, 0.12) + 's';

  if(progress > 55) loaderTitle.textContent = 'SUMBU MENYALA...';
  if(progress > 85) loaderTitle.textContent = 'BERSIAP MELEDAK!';
}, 160);

function detonateTNT(){
  loaderTitle.textContent = 'DUAR!';

  // TNT pop animation
  tntBlock.classList.remove('priming');
  tntBlock.classList.add('exploding');
  tntFuse.classList.add('exploding');
  tntSpark.classList.add('exploding');

  // full-screen flash
  flashEl.classList.add('flash');

  // screen shake
  loaderEl.classList.add('loader-shake');

  // explosion particle burst from TNT position
  const rect = tntBlock.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  const explosionColors = ['#ff9800','#d84315','#ffeb3b','#c0392b','#4a4a4a','#8d8f91'];
  for(let i=0;i<36;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.width = (4 + Math.random()*6) + 'px';
    p.style.height = p.style.width;
    p.style.background = explosionColors[Math.floor(Math.random()*explosionColors.length)];
    p.style.zIndex = 9998;
    document.body.appendChild(p);
    const angle = Math.random()*Math.PI*2;
    const dist = 90 + Math.random()*160;
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist - 40;
    p.animate([
      { transform:'translate(0,0) rotate(0deg) scale(1)', opacity:1 },
      { transform:`translate(${dx}px, ${dy}px) rotate(${Math.random()*360}deg) scale(.3)`, opacity:0 }
    ], { duration: 550 + Math.random()*300, easing:'cubic-bezier(.15,.8,.3,1)' });
    setTimeout(()=>p.remove(), 900);
  }

  setTimeout(()=>{ flashEl.classList.remove('flash'); }, 90);
  setTimeout(()=>{ loaderEl.classList.add('hide'); }, 480);
}

/* ============ NAV / PAGE SWITCH ============ */
let panelUnlocked = false;

function showPage(id){
  if(id === 'panel' && !isLoggedIn){
    pendingPageAfterLogin = 'panel';
    openLoginModal();
    return;
  }
  if(id === 'panel' && !panelUnlocked){
    openPaymentGate();
    return;
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.navtab').forEach(t=>{
    t.classList.toggle('active', t.dataset.page === id);
  });
  document.querySelectorAll('.side-link').forEach(t=>{
    t.classList.toggle('active', t.dataset.page === id);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

function goToPage(id){
  showPage(id);
  closeMenu();
}

/* ============ LOGIN / DAFTAR AKUN ============ */
const loginOverlay = document.getElementById('loginOverlay');
let isLoggedIn = false;
let currentUser = null;
let pendingPageAfterLogin = null;
let registeredUsers = []; // { name, email, passObfuscated } — hanya di memori sesi ini, tidak pernah dikirim ke mana pun

const avatarColors = ['#4285F4','#EA4335','#34A853','#F4B400','#9334E6','#00ACC1'];

const googleAccountOptions = [
  { name: 'Steve Craft',   email: 'steve.craft@gmail.com',   color: '#4285F4', joined: '12 Maret 2025' },
  { name: 'Alex Miner',    email: 'alex.miner@gmail.com',    color: '#EA4335', joined: '03 Juni 2025' },
  { name: 'Herobrine Dev', email: 'herobrine.dev@gmail.com', color: '#34A853', joined: '27 Januari 2026' }
];

function openLoginModal(){
  closeMenu();
  document.getElementById('regName').value = '';
  document.getElementById('regEmail').value = '';
  document.getElementById('regPassword').value = '';
  document.getElementById('regAgree').checked = false;
  document.getElementById('loginEmail2').value = '';
  document.getElementById('loginPassword2').value = '';
  document.getElementById('loginAgree2').checked = false;
  switchLoginTab('daftar');
  closeGooglePicker();
  loginOverlay.classList.add('show');
}
function closeLoginModal(){
  loginOverlay.classList.remove('show');
  pendingPageAfterLogin = null;
}

function switchLoginTab(tab){
  document.querySelectorAll('.login-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('tabDaftar').style.display = tab === 'daftar' ? 'block' : 'none';
  document.getElementById('tabMasuk').style.display = tab === 'masuk' ? 'block' : 'none';
}

function togglePasswordVisibility(inputId, btn){
  const input = document.getElementById(inputId);
  if(input.type === 'password'){
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

/* Daftar akun baru — otomatis masuk begitu berhasil */
function registerAccount(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const agree = document.getElementById('regAgree').checked;

  if(!name){ showToast('Isi dulu nama kamu.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Masukkan alamat email yang valid.'); return; }
  if(password.length < 6){ showToast('Kata sandi minimal 6 karakter.'); return; }
  if(!agree){ showToast('Centang dulu persetujuan Syarat & Ketentuan sebelum lanjut.'); return; }

  if(registeredUsers.some(u => u.email === email)){
    showToast('Email sudah terdaftar. Silakan masuk lewat tab MASUK.');
    switchLoginTab('masuk');
    document.getElementById('loginEmail2').value = email;
    return;
  }

  registeredUsers.push({ name, email, passObfuscated: btoa(password), joined: formatJoinDate(), twoFAEnabled: false });
  const color = avatarColors[Math.floor(Math.random()*avatarColors.length)];
  showToast(`Mendaftarkan akun ${name}...`);

  setTimeout(()=>{
    completeLogin({ name, email, color, joined: registeredUsers.find(u=>u.email===email).joined }, `Berhasil daftar & masuk sebagai ${name}!`);
  }, 700);
}

function formatJoinDate(){
  return new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}

/* Masuk dengan akun yang sudah terdaftar */
let resetTargetEmail = null;

function forgotPassword(){
  const email = document.getElementById('loginEmail2').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showToast('Isi dulu email kamu di kolom Email sebelum klik "Lupa kata sandi?".');
    return;
  }
  const user = registeredUsers.find(u => u.email === email);
  if(!user){
    showToast('Email belum terdaftar. Silakan daftar dulu lewat tab DAFTAR.');
    return;
  }
  resetTargetEmail = email;
  document.getElementById('resetEmailLabel').textContent = email;
  document.getElementById('resetNewPassword').value = '';
  document.getElementById('resetConfirmPassword').value = '';
  document.getElementById('resetPasswordOverlay').classList.add('show');
}

function closeResetPassword(){
  document.getElementById('resetPasswordOverlay').classList.remove('show');
  resetTargetEmail = null;
}

function submitResetPassword(){
  const newPass = document.getElementById('resetNewPassword').value;
  const confirmPass = document.getElementById('resetConfirmPassword').value;

  if(newPass.length < 6){
    showToast('Kata sandi baru minimal 6 karakter.');
    return;
  }
  if(newPass !== confirmPass){
    showToast('Konfirmasi kata sandi tidak cocok.');
    return;
  }

  const user = registeredUsers.find(u => u.email === resetTargetEmail);
  if(!user){
    showToast('Akun tidak ditemukan. Coba lagi dari awal.');
    closeResetPassword();
    return;
  }

  user.passObfuscated = btoa(newPass);
  showToast('Kata sandi berhasil diganti! Silakan masuk dengan kata sandi barumu.');
  closeResetPassword();

  document.getElementById('loginEmail2').value = user.email;
  document.getElementById('loginPassword2').value = '';
}

function loginAccount(){
  const email = document.getElementById('loginEmail2').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword2').value;
  const agree = document.getElementById('loginAgree2').checked;

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Masukkan alamat email yang valid.'); return; }
  if(!password){ showToast('Isi dulu kata sandi kamu.'); return; }
  if(!agree){ showToast('Centang dulu persetujuan Syarat & Ketentuan sebelum lanjut.'); return; }

  const user = registeredUsers.find(u => u.email === email);
  if(!user){
    showToast('Email belum terdaftar. Silakan daftar dulu lewat tab DAFTAR.');
    switchLoginTab('daftar');
    document.getElementById('regEmail').value = email;
    return;
  }
  if(user.passObfuscated !== btoa(password)){
    showToast('Kata sandi salah. Coba lagi.');
    return;
  }

  const color = avatarColors[Math.floor(Math.random()*avatarColors.length)];

  if(user.twoFAEnabled){
    closeLoginModal();
    startTwoFAVerification({ name: user.name, email: user.email, color, joined: user.joined });
    return;
  }

  showToast(`Masuk sebagai ${user.name}...`);
  setTimeout(()=>{
    completeLogin({ name: user.name, email: user.email, color, joined: user.joined });
  }, 700);
}

/* Lanjutkan dengan Google — memilih profil langsung, TIDAK PERNAH meminta kata sandi */
function openGooglePicker(){
  const list = document.getElementById('accountList');
  list.innerHTML = '';
  googleAccountOptions.forEach((acc, i)=>{
    const btn = document.createElement('button');
    btn.className = 'account-item';
    btn.onclick = ()=>loginWithGoogleAccount(i);
    btn.innerHTML = `
      <div class="account-avatar" style="background:${acc.color};">${acc.name.charAt(0)}</div>
      <div>
        <div class="account-name">${acc.name}</div>
        <div class="account-email">${acc.email}</div>
      </div>`;
    list.appendChild(btn);
  });
  const otherBtn = document.createElement('button');
  otherBtn.className = 'account-item account-item-other';
  otherBtn.onclick = closeGooglePicker;
  otherBtn.innerHTML = `
    <div class="account-avatar account-avatar-generic">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#5f6368"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.5h19.6v-2.5c0-3.3-6.5-4.9-9.8-4.9z"/></svg>
    </div>
    <div class="account-name">Gunakan akun lain</div>`;
  list.appendChild(otherBtn);

  document.getElementById('loginBoxIcon').innerHTML = `<svg viewBox="0 0 48 48" width="28" height="28" style="margin:0 auto;"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.9 0-12.5-5.6-12.5-12.5S17.1 10.5 24 10.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 4.9 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12.5 24 12.5c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 6.9 29.6 5 24 5c-7.6 0-14.1 4.3-17.4 10.7z"/><path fill="#4CAF50" d="M24 43c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.5-7.5 2.5-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.8 38.6 16.3 43 24 43z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.5C40.6 36.4 44 30.7 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>`;
  document.getElementById('loginBoxTitle').textContent = 'Pilih akun';
  document.getElementById('loginBoxTitle').classList.add('google-view-title');
  document.querySelector('#loginOverlay .gate-sub').innerHTML = 'untuk melanjutkan ke <b>blockhost.com</b>';

  document.getElementById('loginMainView').style.display = 'none';
  document.getElementById('googlePickerView').style.display = 'block';
  document.querySelector('.login-box').classList.add('google-view');
}
function closeGooglePicker(){
  document.getElementById('loginMainView').style.display = 'block';
  document.getElementById('googlePickerView').style.display = 'none';
  document.getElementById('loginBoxIcon').innerHTML = '🔐';
  document.getElementById('loginBoxTitle').textContent = 'MASUK / DAFTAR AKUN';
  document.getElementById('loginBoxTitle').classList.remove('google-view-title');
  document.querySelector('#loginOverlay .gate-sub').innerHTML = 'untuk melanjutkan ke <b class="accent-gold">blockhost.com</b>';
  document.querySelector('.login-box').classList.remove('google-view');
}

function loginWithGoogleAccount(i){
  const acc = googleAccountOptions[i];
  showToast(`Masuk sebagai ${acc.name}...`);
  setTimeout(()=>{
    completeLogin({ name: acc.name, email: acc.email, color: acc.color, joined: acc.joined }, `Berhasil masuk sebagai ${acc.name}!`);
  }, 700);
}

function completeLogin(user, message){
  isLoggedIn = true;
  currentUser = user;
  updateLoginUI();
  closeLoginModal();
  closeTwoFAModal();
  showToast(message || `Berhasil masuk sebagai ${user.name}!`);
  if(pendingPageAfterLogin){
    const target = pendingPageAfterLogin;
    pendingPageAfterLogin = null;
    showPage(target);
  }
}

/* ============ VERIFIKASI DUA LANGKAH (2FA) ============ */
let pendingTwoFAUser = null;
let pendingTwoFACode = null;

function startTwoFAVerification(user){
  pendingTwoFAUser = user;
  pendingTwoFACode = String(Math.floor(100000 + Math.random()*900000));
  document.getElementById('twoFAEmailLabel').textContent = user.email;
  document.getElementById('twoFACodeInput').value = '';
  document.getElementById('twoFAOverlay').classList.add('show');
  showToast(`Kode verifikasi (simulasi, belum ada email sungguhan): ${pendingTwoFACode}`);
}

function closeTwoFAModal(){
  document.getElementById('twoFAOverlay').classList.remove('show');
  pendingTwoFAUser = null;
  pendingTwoFACode = null;
}

function resendTwoFACode(){
  if(!pendingTwoFAUser) return;
  pendingTwoFACode = String(Math.floor(100000 + Math.random()*900000));
  showToast(`Kode verifikasi baru (simulasi): ${pendingTwoFACode}`);
}

function submitTwoFACode(){
  const code = document.getElementById('twoFACodeInput').value.trim();
  if(!pendingTwoFAUser){
    showToast('Sesi verifikasi berakhir. Silakan masuk ulang.');
    closeTwoFAModal();
    return;
  }
  if(code !== pendingTwoFACode){
    showToast('Kode verifikasi salah. Coba lagi.');
    return;
  }
  const user = pendingTwoFAUser;
  completeLogin(user, `Verifikasi berhasil! Masuk sebagai ${user.name}.`);
}

function updateLoginUI(){
  const btn = document.getElementById('loginBtn');
  const txt = document.getElementById('loginBtnText');
  const iconSlot = document.getElementById('loginIconSlot');
  if(isLoggedIn){
    btn.classList.add('logged-in');
    btn.onclick = openProfileModal;
    iconSlot.innerHTML = `<span class="user-avatar" style="background:${currentUser.color};">${currentUser.name.charAt(0).toUpperCase()}</span>`;
    txt.textContent = currentUser.name.split(' ')[0];
  } else {
    btn.classList.remove('logged-in');
    btn.onclick = openLoginModal;
    iconSlot.textContent = '🔐';
    txt.textContent = translations[currentLang].login_btn_default;
  }
}

function logoutUser(){
  isLoggedIn = false;
  currentUser = null;
  updateLoginUI();
  showToast('Berhasil keluar dari akun.');
  showPage('beranda');
}

/* ============ PROFIL AKUN ============ */
let xboxGamertag = null;
let isEmailNotifEnabled = true;

function openProfileModal(){
  if(!isLoggedIn || !currentUser) return;
  closeMenu();

  document.getElementById('profileAvatarBig').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('profileAvatarBig').style.background = currentUser.color;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileJoined').textContent = `Member sejak ${currentUser.joined || '-'}`;
  document.getElementById('profileTierLabel').textContent = currentTier.toUpperCase();

  document.getElementById('xboxGamertagInput').value = xboxGamertag || '';
  updateXboxUI();
  const regUser = registeredUsers.find(u => u.email === currentUser.email);
  document.getElementById('toggle2FA').checked = regUser ? !!regUser.twoFAEnabled : false;
  document.getElementById('toggle2FA').disabled = !regUser;
  document.getElementById('toggleEmailNotif').checked = isEmailNotifEnabled;

  document.getElementById('profileOverlay').classList.add('show');
}
function closeProfileModal(){
  document.getElementById('profileOverlay').classList.remove('show');
}

function updateXboxUI(){
  const label = document.getElementById('xboxStatusLabel');
  const btn = document.getElementById('xboxLinkBtn');
  if(xboxGamertag){
    label.textContent = `Tertaut sebagai "${xboxGamertag}"`;
    label.className = 'profile-status-on';
    btn.textContent = 'PUTUSKAN';
  } else {
    label.textContent = 'Belum tertaut';
    label.className = 'profile-status-off';
    btn.textContent = 'TAUTKAN';
  }
}

function toggleXboxLink(){
  const input = document.getElementById('xboxGamertagInput');
  if(xboxGamertag){
    xboxGamertag = null;
    input.value = '';
    updateXboxUI();
    showToast('Akun Xbox Live diputuskan dari BlockHost.');
    return;
  }
  const tag = input.value.trim();
  if(!tag){
    showToast('Isi dulu gamertag Xbox Live kamu.');
    return;
  }
  xboxGamertag = tag;
  updateXboxUI();
  showToast(`Akun Xbox Live "${tag}" berhasil ditautkan! Kamu sekarang bisa main cross-play.`);
}

function changePasswordFromProfile(){
  if(!currentUser) return;
  const isRegisteredEmail = registeredUsers.some(u => u.email === currentUser.email);
  if(!isRegisteredEmail){
    showToast('Akun ini masuk lewat Google — atur ulang kata sandi lewat akun Google-mu langsung.');
    return;
  }
  resetTargetEmail = currentUser.email;
  document.getElementById('resetEmailLabel').textContent = currentUser.email;
  document.getElementById('resetNewPassword').value = '';
  document.getElementById('resetConfirmPassword').value = '';
  closeProfileModal();
  document.getElementById('resetPasswordOverlay').classList.add('show');
}

function toggle2FASetting(checked){
  const regUser = registeredUsers.find(u => u.email === currentUser.email);
  if(!regUser){
    showToast('2FA hanya bisa diatur untuk akun email/kata sandi BlockHost, bukan akun Google.');
    document.getElementById('toggle2FA').checked = false;
    return;
  }
  regUser.twoFAEnabled = checked;
  showToast(checked ? 'Verifikasi dua langkah diaktifkan. Kode akan diminta setiap kali masuk.' : 'Verifikasi dua langkah dimatikan.');
}
function toggleEmailNotifSetting(checked){
  isEmailNotifEnabled = checked;
  showToast(isEmailNotifEnabled ? 'Notifikasi email diaktifkan.' : 'Notifikasi email dimatikan.');
}
function changeProfileLanguage(lang){
  setLanguage(lang);
}

/* ============ BAHASA (ID/EN) ============ */
let currentLang = 'id';

const translations = {
  id: {
    nav_home:'BERANDA', nav_features:'FITUR', nav_plans:'PAKET', nav_panel:'PANEL', nav_contact:'KONTAK',
    side_home:'🏠 BERANDA', side_features:'⛏ FITUR', side_plans:'💎 PAKET', side_panel:'🎛 PANEL', side_contact:'✉ KONTAK',
    login_title:'MASUK / DAFTAR AKUN', login_google_btn:'Lanjutkan dengan Google', login_divider:'ATAU PAKAI EMAIL',
    tab_daftar:'DAFTAR', tab_masuk:'MASUK',
    field_nama:'Nama', field_email:'Email', field_password:'Kata Sandi',
    agree_text:'Saya menyetujui <b>Syarat &amp; Ketentuan</b> serta <b>Kebijakan Privasi</b> BlockHost.',
    btn_daftar_sekarang:'DAFTAR SEKARANG', forgot_pw:'Lupa kata sandi?', btn_masuk_sekarang:'MASUK SEKARANG',
    profile_billing_title:'💎 Paket & Tagihan', profile_view_invoice:'📄 Lihat Riwayat Transaksi',
    profile_xbox_title:'🎮 Xbox Live / Microsoft Account',
    profile_xbox_hint:'Wajib ditautkan supaya bisa bermain online di server Bedrock (cross-play Xbox, PS, mobile, Windows).',
    profile_security_title:'🔒 Keamanan', profile_change_pw:'Ubah Kata Sandi', profile_2fa:'Verifikasi Dua Langkah (2FA)',
    profile_pref_title:'⚙️ Preferensi', profile_email_notif:'Notifikasi email (server offline, invoice, dll)',
    profile_language:'Bahasa', profile_logout:'KELUAR', profile_delete_account:'Hapus akun secara permanen',
    hero_eyebrow:'HOSTING BEDROCK EDITION',
    hero_h1:'Nyalakan server <span class="accent">Minecraft&nbsp;Bedrock</span> milikmu dalam <span class="accent-gold">60 detik</span>',
    hero_desc:'SSD NVMe, proteksi anti-DDoS, dan panel kontrol sendiri — cocok untuk kamu yang main bareng teman lewat Xbox, PlayStation, mobile, atau Windows. Tanpa perlu ngerti server, tinggal klik nyala.',
    btn_start:'MULAI SEKARANG', btn_view_panel:'LIHAT PANEL',
    stat_uptime:'UPTIME', stat_setup:'WAKTU SETUP', stat_support:'DUKUNGAN',
    fitur_eyebrow:'FITUR LENGKAP', fitur_h1:'Semua yang dibutuhkan server Bedrock-mu',
    fitur_desc:'Dari proteksi keamanan sampai kontrol penuh atas dunia game kamu, semuanya sudah termasuk di setiap paket.',
    paket_eyebrow:'PILIH PAKETMU', paket_h1:'Paket hosting, disusun seperti resep crafting',
    paket_desc:'Semakin tinggi tier bahan, semakin besar kapasitas server. Bisa upgrade kapan saja lewat panel kontrol.',
    panel_eyebrow:'PRATINJAU INTERAKTIF', panel_h1:'Panel kontrol server kamu',
    panel_desc:'Berikut tampilan panel yang akan kamu pakai untuk mengelola server Bedrock. Coba tekan tombol di bawah.',
    kontak_eyebrow:'BUTUH BANTUAN?', kontak_h1:'Hubungi tim BlockHost',
    kontak_desc:'Ada pertanyaan sebelum order, atau butuh bantuan teknis? Kirim pesan atau cek pertanyaan umum di bawah.',
    label_nama:'NAMA', label_email:'EMAIL', label_pesan:'PESAN', btn_kirim_pesan:'KIRIM PESAN',
    faq_title:'PERTANYAAN UMUM',
    footer_terms:'Syarat & Ketentuan', footer_privacy:'Kebijakan Privasi', footer_status:'Status Server', footer_contact:'Kontak',
    login_btn_default:'Masuk / Daftar'
  },
  en: {
    nav_home:'HOME', nav_features:'FEATURES', nav_plans:'PLANS', nav_panel:'PANEL', nav_contact:'CONTACT',
    side_home:'🏠 HOME', side_features:'⛏ FEATURES', side_plans:'💎 PLANS', side_panel:'🎛 PANEL', side_contact:'✉ CONTACT',
    login_title:'SIGN IN / SIGN UP', login_google_btn:'Continue with Google', login_divider:'OR USE EMAIL',
    tab_daftar:'SIGN UP', tab_masuk:'SIGN IN',
    field_nama:'Name', field_email:'Email', field_password:'Password',
    agree_text:'I agree to BlockHost\'s <b>Terms &amp; Conditions</b> and <b>Privacy Policy</b>.',
    btn_daftar_sekarang:'SIGN UP NOW', forgot_pw:'Forgot password?', btn_masuk_sekarang:'SIGN IN NOW',
    profile_billing_title:'💎 Plan & Billing', profile_view_invoice:'📄 View Transaction History',
    profile_xbox_title:'🎮 Xbox Live / Microsoft Account',
    profile_xbox_hint:'Required to play online on the Bedrock server (cross-play with Xbox, PS, mobile, Windows).',
    profile_security_title:'🔒 Security', profile_change_pw:'Change Password', profile_2fa:'Two-Factor Verification (2FA)',
    profile_pref_title:'⚙️ Preferences', profile_email_notif:'Email notifications (server offline, invoices, etc.)',
    profile_language:'Language', profile_logout:'LOG OUT', profile_delete_account:'Permanently delete account',
    hero_eyebrow:'BEDROCK EDITION HOSTING',
    hero_h1:'Power up your <span class="accent">Minecraft&nbsp;Bedrock</span> server in <span class="accent-gold">60 seconds</span>',
    hero_desc:'NVMe SSD, anti-DDoS protection, and your own control panel — perfect for playing with friends on Xbox, PlayStation, mobile, or Windows. No server know-how needed, just click to launch.',
    btn_start:'GET STARTED', btn_view_panel:'VIEW PANEL',
    stat_uptime:'UPTIME', stat_setup:'SETUP TIME', stat_support:'SUPPORT',
    fitur_eyebrow:'FULL FEATURE SET', fitur_h1:'Everything your Bedrock server needs',
    fitur_desc:'From security protection to full control over your game world, it\'s all included in every plan.',
    paket_eyebrow:'CHOOSE YOUR PLAN', paket_h1:'Hosting plans, crafted like a recipe',
    paket_desc:'The higher the tier, the bigger the server capacity. Upgrade anytime through the control panel.',
    panel_eyebrow:'INTERACTIVE PREVIEW', panel_h1:'Your server control panel',
    panel_desc:'Here\'s the panel you\'ll use to manage your Bedrock server. Try pressing the buttons below.',
    kontak_eyebrow:'NEED HELP?', kontak_h1:'Contact the BlockHost team',
    kontak_desc:'Questions before ordering, or need technical help? Send a message or check the FAQs below.',
    label_nama:'NAME', label_email:'EMAIL', label_pesan:'MESSAGE', btn_kirim_pesan:'SEND MESSAGE',
    faq_title:'FREQUENTLY ASKED QUESTIONS',
    footer_terms:'Terms & Conditions', footer_privacy:'Privacy Policy', footer_status:'Server Status', footer_contact:'Contact',
    login_btn_default:'Sign In / Sign Up'
  }
};

function setLanguage(lang){
  if(!translations[lang]) return;
  currentLang = lang;
  const dict = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.dataset.i18n;
    if(dict[key] !== undefined) el.innerHTML = dict[key];
  });
  document.documentElement.lang = lang;
  const langSelect = document.getElementById('profileLangSelect');
  if(langSelect) langSelect.value = lang;
  if(!isLoggedIn){
    document.getElementById('loginBtnText').textContent = dict.login_btn_default;
  }
  showToast(lang === 'en' ? 'Language switched to English.' : 'Bahasa diubah ke Bahasa Indonesia.');
}

function logoutFromProfile(){
  closeProfileModal();
  logoutUser();
}

function deleteAccountFromProfile(){
  if(!confirm('Yakin mau menghapus akun ini secara permanen? Semua data server, backup, dan riwayat transaksi akan hilang.')){
    return;
  }
  const email = currentUser.email;
  registeredUsers = registeredUsers.filter(u => u.email !== email);
  closeProfileModal();
  logoutUser();
  showToast('Akun berhasil dihapus secara permanen.');
}

/* ============ QRIS PAYMENT GATE ============ */
const qrisGateOverlay = document.getElementById('qrisGateOverlay');

function generateFakeQR(){
  const grid = document.getElementById('fakeQrGrid');
  grid.innerHTML = '';
  const size = 21;
  for(let r=0;r<size;r++){
    for(let c=0;c<size;c++){
      const cell = document.createElement('div');
      const inFinder =
        (r < 6 && c < 6) || (r < 6 && c > size-7) || (r > size-7 && c < 6);
      if(inFinder){
        const ring = Math.max(Math.abs(r - (r<6?2:r>size-7?size-4:2)), 0);
        cell.classList.add('on');
      } else if(Math.random() > 0.55){
        cell.classList.add('on');
      }
      grid.appendChild(cell);
    }
  }
}

function openPaymentGate(){
  generateFakeQR();
  document.getElementById('gateStatus').textContent = 'Menunggu pembayaran...';
  const btn = document.getElementById('confirmPayBtn');
  btn.disabled = false;
  btn.textContent = 'SAYA SUDAH BAYAR (SIMULASI)';
  qrisGateOverlay.classList.add('show');
}
function closePaymentGate(){
  qrisGateOverlay.classList.remove('show');
}

function confirmPayment(){
  const btn = document.getElementById('confirmPayBtn');
  const status = document.getElementById('gateStatus');
  btn.disabled = true;
  btn.textContent = 'MEMVERIFIKASI...';
  status.textContent = 'Mengecek status pembayaran...';

  setTimeout(()=>{
    status.textContent = '✅ Pembayaran terkonfirmasi (simulasi)!';
    btn.textContent = 'BERHASIL! MEMBUKA PANEL...';
    setTimeout(()=>{
      panelUnlocked = true;
      const tierToApply = pendingTier || currentTier;
      applyTierSpecs(tierToApply);
      logTransaction(tierToApply, tierPrices[tierToApply] || 'Rp0');
      pendingTier = null;
      closePaymentGate();
      showPage('panel');
      showToast(`Pembayaran berhasil! Server disiapkan sesuai spesifikasi paket ${tierToApply.toUpperCase()}.`);
    }, 700);
  }, 1500);
}

/* ============ SLIDE MENU (GESER MENU) ============ */
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function openMenu(){
  sideMenu.classList.add('open');
  menuOverlay.classList.add('show');
}
function closeMenu(){
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('show');
}
function toggleMenu(){
  sideMenu.classList.contains('open') ? closeMenu() : openMenu();
}

/* Swipe gesture: geser dari tepi kiri untuk buka, geser kiri untuk tutup */
let touchStartX = 0;
let touchStartY = 0;
let touchTracking = false;

document.addEventListener('touchstart', (e)=>{
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchTracking = touchStartX < 24 || sideMenu.classList.contains('open');
}, { passive:true });

document.addEventListener('touchend', (e)=>{
  if(!touchTracking) return;
  const t = e.changedTouches[0];
  const deltaX = t.clientX - touchStartX;
  const deltaY = Math.abs(t.clientY - touchStartY);
  if(deltaY > 60) { touchTracking = false; return; }

  if(!sideMenu.classList.contains('open') && touchStartX < 24 && deltaX > 55){
    openMenu();
  } else if(sideMenu.classList.contains('open') && deltaX < -55){
    closeMenu();
  }
  touchTracking = false;
}, { passive:true });

/* ============ BUTTON CLICK PARTICLE ANIMATION ============ */
const particleColors = ['#8bc34a','#f4c430','#8d8f91','#4fd8e0','#6b4226'];
document.addEventListener('click', function(e){
  const btn = e.target.closest('.btn, .navtab, .ctab, .fmtab, .addon-map-tab, .mini-btn, .copy-btn, .faq-q, .side-link, .hamburger, .gate-close, .gdrive-btn, .login-btn, .account-item, .login-tab, .toggle-pw, .google-alt-btn, .login-back-link, .footer-social-btn, .profile-danger-link');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top + rect.height/2;
  for(let i=0;i<8;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.background = particleColors[Math.floor(Math.random()*particleColors.length)];
    document.body.appendChild(p);
    const angle = (Math.PI*2/8)*i + Math.random()*0.5;
    const dist = 30 + Math.random()*35;
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist;
    p.animate([
      { transform:'translate(0,0) rotate(0deg) scale(1)', opacity:1 },
      { transform:`translate(${dx}px, ${dy}px) rotate(${Math.random()*180}deg) scale(0.2)`, opacity:0 }
    ], { duration: 450 + Math.random()*150, easing:'cubic-bezier(.2,.8,.3,1)' });
    setTimeout(()=>p.remove(), 650);
  }
});

/* ============ PRICING SELECT ============ */
const tierPrices = {
  'Free': 'Rp0',
  'Batu': 'Rp15.000',
  'Besi': 'Rp35.000',
  'Emas': 'Rp65.000',
  'Berlian': 'Rp120.000'
};
const tierSpecs = {
  'Free':    { ram: 0.5, slots: 5,           storage: '1 GB NVMe',  backupLabel: 'Manual saja',        backupIntervalMs: null },
  'Batu':    { ram: 1,   slots: 10,          storage: '5 GB NVMe',  backupLabel: 'Mingguan',           backupIntervalMs: 90000 },
  'Besi':    { ram: 2,   slots: 20,          storage: '10 GB NVMe', backupLabel: 'Harian',             backupIntervalMs: 60000 },
  'Emas':    { ram: 4,   slots: 40,          storage: '25 GB NVMe', backupLabel: 'Harian',             backupIntervalMs: 45000 },
  'Berlian': { ram: 10,  slots: 'Unlimited', storage: '60 GB NVMe', backupLabel: 'Harian + Manual',    backupIntervalMs: 30000 }
};

let currentTier = 'Besi';
let pendingTier = null;
let transactionHistory = [];
let packageExpiryDate = null; // null = tidak ada masa berlaku (paket Free)

/* ============ PERSISTENSI STATUS PAKET (real-world days) ============ */
const STORAGE_KEY = 'blockhost_package_state';

function saveAppState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentTier,
      packageExpiryDate: packageExpiryDate ? packageExpiryDate.toISOString() : null,
      panelUnlocked,
      transactionHistory
    }));
  }catch(e){
    // localStorage tidak tersedia (mis. mode privat/preview terbatas) — lewati saja, fitur tetap jalan untuk sesi ini
  }
}

function loadAppState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data.currentTier && tierSpecs[data.currentTier]) currentTier = data.currentTier;
    packageExpiryDate = data.packageExpiryDate ? new Date(data.packageExpiryDate) : null;
    panelUnlocked = !!data.panelUnlocked;
    if(Array.isArray(data.transactionHistory)) transactionHistory = data.transactionHistory;
  }catch(e){
    // data tersimpan rusak/tidak valid — abaikan, mulai dari kondisi awal
  }
}
loadAppState();

function selectTier(name){
  pendingTier = name;

  if(name === 'Free'){
    showToast('Paket Free dipilih! Langsung masuk ke Panel, tanpa perlu bayar.');
    applyTierSpecs('Free');
    panelUnlocked = true;
    logTransaction('Free', 'Rp0');
    setTimeout(()=>showPage('panel'), 500);
    return;
  }

  document.getElementById('gateAmount').textContent = tierPrices[name] || 'Rp35.000';
  showToast(`Paket ${name} dipilih! Lanjutkan ke pembayaran.`);
  setTimeout(()=>openPaymentGate(), 500);
}

/* ============ RIWAYAT TRANSAKSI ============ */

function logTransaction(tier, price){
  const now = new Date();
  const dateLabel = now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) +
    ' ' + now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  transactionHistory.unshift({
    invoiceId: 'INV-' + Math.floor(100000 + Math.random()*900000),
    tier, price, date: dateLabel
  });

  if(tier === 'Free'){
    packageExpiryDate = null;
  } else {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    packageExpiryDate = expiry;
  }
  renderExpiryNotice();
  saveAppState();
}

function renderExpiryNotice(){
  const notice = document.getElementById('expiryNotice');
  const textEl = document.getElementById('expiryNoticeText');
  const renewBtn = document.getElementById('expiryRenewBtn');
  if(!notice) return;

  if(!panelUnlocked){
    notice.style.display = 'none';
    return;
  }

  if(!packageExpiryDate){
    notice.style.display = 'flex';
    notice.className = 'expiry-notice expiry-ok';
    textEl.textContent = `✅ Paket ${currentTier} tidak memiliki masa aktif — gratis selamanya.`;
    renewBtn.style.display = 'none';
    return;
  }

  const dateLabel = packageExpiryDate.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  const msPerDay = 1000*60*60*24;
  const daysLeft = Math.ceil((packageExpiryDate - new Date()) / msPerDay);

  notice.style.display = 'flex';

  if(daysLeft > 7){
    notice.className = 'expiry-notice expiry-ok';
    textEl.textContent = `✅ Paket ${currentTier} aktif hingga ${dateLabel} (${daysLeft} hari lagi).`;
    renewBtn.style.display = 'none';
  } else if(daysLeft > 0){
    notice.className = 'expiry-notice expiry-warning';
    textEl.textContent = `⚠ Paket ${currentTier} akan berakhir dalam ${daysLeft} hari (${dateLabel}).`;
    renewBtn.style.display = 'inline-block';
  } else {
    notice.className = 'expiry-notice expiry-expired';
    textEl.textContent = `⛔ Paket ${currentTier} sudah kedaluwarsa sejak ${dateLabel}! Server bisa dinonaktifkan sewaktu-waktu.`;
    renewBtn.style.display = 'inline-block';
  }
}

function renewCurrentPlan(){
  if(currentTier === 'Free'){
    showToast('Paket Free tidak perlu diperpanjang.');
    return;
  }
  selectTier(currentTier);
}

function renderInvoiceHtml(){
  if(transactionHistory.length === 0){
    return '<p style="color:var(--text-dimmer);font-size:12.5px;">Belum ada transaksi. Riwayat akan muncul di sini setelah kamu memilih paket.</p>';
  }
  let rows = transactionHistory.map(t => `
    <div class="status-row">
      <span>
        <b style="color:var(--text);">${t.invoiceId}</b><br>
        <span style="font-size:11px;color:var(--text-dimmer);">${t.date} · Paket ${t.tier}</span>
      </span>
      <span class="status-ok">${t.price}</span>
    </div>`).join('');
  return rows;
}

function formatRam(gb){
  return gb < 1 ? Math.round(gb*1000) + ' MB' : gb + ' GB';
}

function applyTierSpecs(name){
  const spec = tierSpecs[name];
  if(!spec) return;
  currentTier = name;

  document.getElementById('activeTierLabel').textContent = name.toUpperCase();
  document.getElementById('storageLabel').textContent = spec.storage;

  const slotsLabel = spec.slots === 'Unlimited' ? '∞' : spec.slots;
  document.getElementById('ramVal').textContent = `0 / ${formatRam(spec.ram)}`;
  document.getElementById('playerCount').textContent = `0 / ${slotsLabel}`;

  applyNicknameFeature(name);
  applyTerminalAccess(name);
  applyAddressFeature(name);
  applyBackupAccess(name);

  document.getElementById('backupFreqLabel').textContent = spec.backupLabel;
  if(serverState === 'online') restartAutoBackup();

  renderExpiryNotice();
}

/* ============ SERVER NICKNAME (semua paket kecuali Free = custom) ============ */
const nicknameWords = ['craftland','skyforge','stonepeak','ironvale','goldrush','duskmine','emberwood','frostpine','lavacore','mossyhollow'];
let customNicknames = { Batu: '', Besi: '', Emas: '', Berlian: '' };

function generateRandomNickname(){
  const word = nicknameWords[Math.floor(Math.random()*nicknameWords.length)];
  const num = Math.floor(Math.random()*900)+100;
  return `${word}-${num}`;
}

function applyNicknameFeature(tierName){
  const label = document.getElementById('serverNicknameLabel');
  const row = document.getElementById('nicknameRow');
  const lockedHint = document.getElementById('nicknameLockedHint');
  const input = document.getElementById('nicknameInput');

  if(tierName !== 'Free'){
    row.style.display = 'flex';
    lockedHint.style.display = 'none';
    const saved = customNicknames[tierName];
    label.textContent = saved || 'world-survival-01';
    input.value = saved || '';
  } else {
    row.style.display = 'none';
    lockedHint.style.display = 'block';
    label.textContent = generateRandomNickname();
  }
}

function saveNickname(){
  const input = document.getElementById('nicknameInput');
  const name = input.value.trim();
  if(!name){
    showToast('Isi dulu nickname server-nya.');
    return;
  }
  if(!/^[a-zA-Z0-9_-]{3,24}$/.test(name)){
    showToast('Nickname 3-24 karakter, hanya huruf/angka/-/_ ya.');
    return;
  }
  if(currentTier === 'Free'){
    showToast('Custom nickname tidak tersedia untuk paket Free.');
    return;
  }
  customNicknames[currentTier] = name;
  document.getElementById('serverNicknameLabel').textContent = name;
  showToast(`Nickname server diubah jadi "${name}"!`);
}

/* ============ ALAMAT SERVER CUSTOM & PORT (Emas & Berlian) ============ */
let customAddresses = { Emas: null, Berlian: null };

function applyAddressFeature(tierName){
  const row = document.getElementById('addressRow');
  const lockedHint = document.getElementById('addressLockedHint');
  const ipText = document.getElementById('ipText');

  if(tierName === 'Emas' || tierName === 'Berlian'){
    row.style.display = 'block';
    lockedHint.style.display = 'none';
    const saved = customAddresses[tierName];
    if(saved){
      ipText.textContent = `${saved.subdomain}${saved.tld}:${saved.port}`;
      document.getElementById('addressSubdomain').value = saved.subdomain;
      document.getElementById('addressTld').value = saved.tld;
      document.getElementById('addressPort').value = saved.port;
    } else {
      ipText.textContent = 'play.blockhost.com:19132';
      document.getElementById('addressSubdomain').value = '';
      document.getElementById('addressTld').value = '.com';
      document.getElementById('addressPort').value = '';
    }
  } else {
    row.style.display = 'none';
    lockedHint.style.display = 'block';
    ipText.textContent = 'play.blockhost.com:19132';
  }
}

function saveCustomAddress(){
  if(currentTier !== 'Emas' && currentTier !== 'Berlian'){
    showToast('Alamat server custom hanya untuk paket Emas & Berlian.');
    return;
  }
  const subInput = document.getElementById('addressSubdomain');
  const tldSelect = document.getElementById('addressTld');
  const portInput = document.getElementById('addressPort');

  const subdomain = subInput.value.trim().toLowerCase();
  const tld = tldSelect.value;
  const port = portInput.value.trim();

  if(!/^[a-z0-9-]{3,20}$/.test(subdomain)){
    showToast('Nama alamat 3-20 karakter, huruf kecil/angka/- saja ya.');
    return;
  }
  const portNum = parseInt(port, 10);
  if(!port || port.length > 5 || isNaN(portNum) || portNum < 1024 || portNum > 65535){
    showToast('Port harus angka maksimal 5 digit, antara 1024-65535.');
    return;
  }

  customAddresses[currentTier] = { subdomain, tld, port: portNum };
  document.getElementById('ipText').textContent = `${subdomain}${tld}:${portNum}`;
  showToast(`Alamat server diubah jadi "${subdomain}${tld}:${portNum}"!`);
}

/* ============ TERMINAL KONSOL (Besi, Emas, Berlian) ============ */
function applyTerminalAccess(tierName){
  const box = document.getElementById('terminalBox');
  const lockedHint = document.getElementById('terminalLockedHint');
  // Terminal Konsol kini tersedia di semua paket
  box.style.display = 'block';
  lockedHint.style.display = 'none';
}

function appendTerminalLine(html, cls){
  const out = document.getElementById('terminalOutput');
  const div = document.createElement('div');
  div.className = 'l' + (cls ? ' ' + cls : '');
  div.style.animationDelay = '0s';
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function runTerminalCommand(){
  const input = document.getElementById('terminalInput');
  const raw = input.value.trim();
  if(!raw) return;
  appendTerminalLine(`<span style="color:var(--text-dimmer);">~$</span> ${raw}`);
  input.value = '';
  processTerminalCommand(raw);
}

function processTerminalCommand(raw){
  if(serverState !== 'online'){
    appendTerminalLine('⚠ Server sedang offline. Nyalakan dulu lewat tombol START.', 'err');
    return;
  }

  const parts = raw.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ').trim();

  switch(cmd){
    case '/help':
      appendTerminalLine('Perintah tersedia: <span class="tag2">/say</span>, <span class="tag2">/time set day|night</span>, <span class="tag2">/weather clear|rain|thunder</span>, <span class="tag2">/gamemode</span>, <span class="tag2">/kick</span>, <span class="tag2">/list</span>, <span class="tag2">/tps</span>, <span class="tag2">/whitelist</span>, <span class="tag2">/stop</span>, <span class="tag2">/restart</span>');
      break;

    case '/say':
      if(!args){ appendTerminalLine('Gunakan: /say &lt;pesan&gt;', 'err'); }
      else { appendTerminalLine(`[SERVER] ${args}`, 'tag'); }
      break;

    case '/time':
      if(args === 'set day'){ appendTerminalLine('☀️ Waktu diubah menjadi Siang.', 'tag'); }
      else if(args === 'set night'){ appendTerminalLine('🌙 Waktu diubah menjadi Malam.', 'tag'); }
      else { appendTerminalLine('Gunakan: /time set day|night', 'err'); }
      break;

    case '/weather':
      if(['clear','rain','thunder'].includes(args)){ appendTerminalLine(`🌤 Cuaca diubah menjadi "${args}".`, 'tag'); }
      else { appendTerminalLine('Gunakan: /weather clear|rain|thunder', 'err'); }
      break;

    case '/gamemode':
      if(args){ appendTerminalLine(`Mode permainan diubah ke "${args}".`, 'tag'); }
      else { appendTerminalLine('Gunakan: /gamemode survival|creative|adventure &lt;pemain&gt;', 'err'); }
      break;

    case '/kick':
      if(args){ appendTerminalLine(`👢 Pemain "${args}" dikeluarkan dari server.`, 'tag'); }
      else { appendTerminalLine('Gunakan: /kick &lt;nama_pemain&gt;', 'err'); }
      break;

    case '/list':
      appendTerminalLine(`Pemain online: ${document.getElementById('playerCount').textContent}`);
      break;

    case '/tps':
      appendTerminalLine(`TPS saat ini: ${document.getElementById('tpsVal').textContent}`);
      break;

    case '/whitelist':
      if(args){ appendTerminalLine(`📋 Whitelist diperbarui: ${args}`, 'tag'); }
      else { appendTerminalLine('Gunakan: /whitelist add|remove &lt;nama_pemain&gt;', 'err'); }
      break;

    case '/stop':
      appendTerminalLine('Menghentikan server dari terminal...', 'err');
      serverStop();
      break;

    case '/restart':
      appendTerminalLine('Merestart server dari terminal...', 'tag');
      serverRestart();
      break;

    default:
      appendTerminalLine(`Perintah tidak dikenal: "${cmd}". Ketik <span class="tag2">/help</span> untuk bantuan.`, 'err');
  }
}

/* ============ TOAST ============ */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2800);
}

/* ============ CONTACT FORM ============ */
function submitContact(e){
  e.preventDefault();
  showToast('Pesan terkirim! Tim kami akan membalas segera.');
  e.target.reset();
  return false;
}
function fakeLink(name){
  showToast(`Membuka ${name}...`);
}

/* ============ MODAL INFO (Syarat & Ketentuan / Kebijakan Privasi / Status Server) ============ */
const infoContent = {
  terms: {
    title: 'SYARAT & KETENTUAN',
    body: `
      <h3>1. Ketentuan Umum</h3>
      <p>Dengan mendaftar dan menggunakan layanan BlockHost, kamu setuju untuk mematuhi syarat & ketentuan ini serta semua kebijakan yang berlaku.</p>
      <h3>2. Penggunaan Layanan</h3>
      <ul>
        <li>Server hanya digunakan untuk keperluan yang sah dan tidak melanggar hukum.</li>
        <li>Dilarang menyalahgunakan server untuk spam, serangan jaringan, atau konten ilegal.</li>
        <li>Setiap paket punya batas RAM, penyimpanan, dan slot pemain sesuai yang tertera di halaman Paket.</li>
      </ul>
      <h3>3. Pembayaran & Perpanjangan</h3>
      <p>Layanan berbayar aktif sesuai masa berlaku paket yang dipilih. Server dapat dinonaktifkan sementara jika perpanjangan tidak dilakukan sebelum masa aktif berakhir.</p>
      <h3>4. Pembatasan Tanggung Jawab</h3>
      <p>BlockHost tidak bertanggung jawab atas kehilangan data akibat kelalaian pengguna sendiri, namun tetap menyediakan sistem backup sesuai paket yang dipilih.</p>
      <h3>5. Perubahan Ketentuan</h3>
      <p>Syarat & Ketentuan ini dapat diperbarui sewaktu-waktu. Perubahan akan diinformasikan melalui situs ini.</p>
    `
  },
  privacy: {
    title: 'KEBIJAKAN PRIVASI',
    body: `
      <h3>1. Data yang Dikumpulkan</h3>
      <ul>
        <li>Nama dan alamat email saat pendaftaran akun.</li>
        <li>Data konfigurasi server (nickname, alamat custom, konten yang diunggah).</li>
      </ul>
      <h3>2. Cara Data Digunakan</h3>
      <p>Data dipakai untuk mengelola akun, menyediakan layanan hosting, dan komunikasi terkait status server maupun pembayaran.</p>
      <h3>3. Keamanan Kata Sandi</h3>
      <p>Kata sandi tidak pernah disimpan dalam bentuk teks biasa. Kami menyarankan penggunaan kata sandi unik yang tidak dipakai di layanan lain.</p>
      <h3>4. Berbagi Data</h3>
      <p>BlockHost tidak menjual data pribadi pengguna ke pihak ketiga. Data hanya dibagikan bila diwajibkan oleh hukum yang berlaku.</p>
      <h3>5. Hak Pengguna</h3>
      <p>Pengguna berhak meminta penghapusan akun dan seluruh data terkait kapan saja melalui halaman Kontak.</p>
    `
  },
  status: {
    title: 'STATUS SERVER',
    body: `
      <div class="status-row"><span>Website BlockHost</span><span class="status-ok">● Beroperasi Normal</span></div>
      <div class="status-row"><span>Panel Kontrol</span><span class="status-ok">● Beroperasi Normal</span></div>
      <div class="status-row"><span>Sistem Pembayaran</span><span class="status-ok">● Beroperasi Normal</span></div>
      <div class="status-row"><span>Region Jakarta, ID</span><span class="status-ok">● Beroperasi Normal</span></div>
      <p style="margin-top:16px;font-size:12px;color:var(--text-dimmer);">Uptime 30 hari terakhir: <b style="color:var(--gold);">99.9%</b></p>
    `
  }
};

function openInfoModal(key){
  let data = infoContent[key];
  if(key === 'invoice'){
    data = { title: 'RIWAYAT TRANSAKSI', body: renderInvoiceHtml() };
  }
  if(!data) return;
  document.getElementById('infoModalTitle').textContent = data.title;
  document.getElementById('infoModalBody').innerHTML = data.body;
  document.getElementById('infoModalOverlay').classList.add('show');
}
function closeInfoModal(){
  document.getElementById('infoModalOverlay').classList.remove('show');
}

/* Hubungkan checkbox persetujuan login ke modal Syarat & Ketentuan */
function bindAgreementLinks(){
  document.querySelectorAll('.login-checkbox-row span').forEach(span=>{
    span.innerHTML = span.innerHTML
      .replace('Syarat &amp; Ketentuan', '<a href="javascript:void(0)" onclick="event.stopPropagation();openInfoModal(\'terms\')" style="color:#1976D2;">Syarat &amp; Ketentuan</a>')
      .replace('Kebijakan Privasi', '<a href="javascript:void(0)" onclick="event.stopPropagation();openInfoModal(\'privacy\')" style="color:#1976D2;">Kebijakan Privasi</a>');
  });
}
bindAgreementLinks();

/* ============ FAQ ACCORDION ============ */
function toggleFaq(el){
  const item = el.parentElement;
  const answer = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(f=>{
    f.classList.remove('open');
    f.querySelector('.faq-a').style.maxHeight = null;
  });
  if(!isOpen){
    item.classList.add('open');
    answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

/* ============ COPY IP ============ */
function copyIP(btn){
  const ip = document.getElementById('ipText').textContent;
  navigator.clipboard?.writeText(ip).catch(()=>{});
  const original = btn.textContent;
  btn.textContent = 'TERSALIN!';
  setTimeout(()=>btn.textContent = original, 1500);
}

/* ============ PANEL KONTROL SIMULATION ============ */
let serverState = 'offline'; // offline | starting | online | stopping
let playerInterval;

function consoleLine(html, delay){
  const c = document.getElementById('console');
  const div = document.createElement('div');
  div.className = 'l';
  div.style.animationDelay = '0s';
  div.innerHTML = html;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function setButtons(starting, online, stopping){
  document.getElementById('btnStart').disabled = starting || online || stopping;
  document.getElementById('btnStop').disabled = !online;
  document.getElementById('btnRestart').disabled = !online;
}

function animateBars(target){
  const cpuBar = document.getElementById('cpuBar');
  const ramBar = document.getElementById('ramBar');
  const tpsBar = document.getElementById('tpsBar');
  const cpuVal = document.getElementById('cpuVal');
  const ramVal = document.getElementById('ramVal');
  const tpsVal = document.getElementById('tpsVal');
  const ramMax = tierSpecs[currentTier].ram;

  if(target === 'up'){
    const cpu = Math.round(30 + Math.random()*35);
    const ram = Math.min(ramMax, (ramMax*0.3 + Math.random()*ramMax*0.5));
    const ramDisplay = ramMax < 1 ? Math.round(ram*1000) + ' MB' : ram.toFixed(1) + ' GB';
    cpuBar.style.width = cpu + '%';
    ramBar.style.width = ((ram/ramMax)*100) + '%';
    tpsBar.style.width = '98%';
    cpuVal.textContent = cpu + '%';
    ramVal.textContent = ramDisplay + ' / ' + formatRam(ramMax);
    tpsVal.textContent = '19.8';
  } else {
    cpuBar.style.width = '0%';
    ramBar.style.width = '0%';
    tpsBar.style.width = '0%';
    cpuVal.textContent = '0%';
    ramVal.textContent = '0 / ' + formatRam(ramMax);
    tpsVal.textContent = '0.0';
  }
}

function serverStart(){
  if(serverState !== 'offline') return;
  serverState = 'starting';
  setButtons(true,false,false);
  document.getElementById('statusDot').className = 'status-dot starting';
  document.getElementById('statusText').textContent = 'MEMULAI...';
  document.getElementById('console').innerHTML = '';

  const seq = [
    'Menyiapkan folder dunia <span class="tag">world-survival-01</span>...',
    'Memuat konfigurasi <span class="tag2">server.properties</span>...',
    'Membuka port <span class="tag">19132/UDP</span>...',
    'Memuat behavior pack & resource pack...',
    '<span class="tag">Server berhasil dinyalakan.</span> Siap menerima pemain.'
  ];
  seq.forEach((line, i)=>{
    setTimeout(()=>consoleLine(line), (i+1)*550);
  });

  setTimeout(()=>{
    serverState = 'online';
    document.getElementById('statusDot').className = 'status-dot online';
    document.getElementById('statusText').textContent = 'ONLINE';
    setButtons(false,true,false);
    animateBars('up');
    showToast('Server berhasil dinyalakan!');
    startPlayerSim();
    startAutoBackup();
  }, (seq.length+1)*550);
}

function serverStop(){
  if(serverState !== 'online') return;
  serverState = 'stopping';
  setButtons(false,false,true);
  document.getElementById('statusDot').className = 'status-dot starting';
  document.getElementById('statusText').textContent = 'BERHENTI...';
  consoleLine('Menyimpan dunia sebelum mematikan server...');
  consoleLine('<span class="err">Server dimatikan oleh admin.</span>');
  clearInterval(playerInterval);
  stopAutoBackup();
  document.getElementById('playerCount').textContent = '0 / ' + (tierSpecs[currentTier].slots === 'Unlimited' ? '∞' : tierSpecs[currentTier].slots);

  setTimeout(()=>{
    serverState = 'offline';
    document.getElementById('statusDot').className = 'status-dot';
    document.getElementById('statusText').textContent = 'OFFLINE';
    setButtons(false,false,false);
    animateBars('down');
    showToast('Server dihentikan.');
  }, 900);
}

function serverRestart(){
  if(serverState !== 'online') return;
  showToast('Merestart server...');
  serverStop();
  setTimeout(()=>{
    serverState = 'offline';
    serverStart();
  }, 1100);
}

/* ============ BACKUP DUNIA (semua paket, auto-backup selama online) ============ */
let backups = [
  { time: 'Kemarin, 21:00', size: '18.4 MB', auto: true },
  { time: '2 hari lalu, 21:00', size: '17.9 MB', auto: true }
];
let autoBackupInterval = null;

function renderBackups(){
  const list = document.getElementById('backupList');
  list.innerHTML = '';
  if(backups.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada backup. Buat backup pertamamu di atas.</div>';
    return;
  }
  backups.forEach((b, i)=>{
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">💾 Backup — ${b.time}</div>
        <div class="item-meta">${b.size} · ${b.auto ? 'Otomatis' : 'Manual'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn active-btn" onclick="restoreBackup(${i})">PULIHKAN</button>
        <button class="mini-btn danger-btn" onclick="removeBackup(${i})">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

function nowLabel(){
  const d = new Date();
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'}) + ', ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}

function manualBackup(){
  if(currentTier === 'Free'){
    showToast('Fitur Backup tidak tersedia untuk paket Free. Upgrade paket untuk mengaktifkannya.');
    return;
  }
  const btn = document.getElementById('btnManualBackup');
  const wrap = document.getElementById('backupProgressWrap');
  const bar = document.getElementById('backupProgressBar');
  const pctEl2 = document.getElementById('backupPct');

  btn.disabled = true;
  wrap.classList.add('show');
  let pct = 0;
  const timer = setInterval(()=>{
    pct += Math.random()*25 + 10;
    if(pct >= 100){
      pct = 100;
      clearInterval(timer);
      setTimeout(()=>{
        wrap.classList.remove('show');
        btn.disabled = false;
        backups.unshift({ time: nowLabel(), size: (Math.random()*30+5).toFixed(1) + ' MB', auto: false });
        renderBackups();
        showToast('Backup manual berhasil dibuat!');
      }, 350);
    }
    bar.style.width = pct + '%';
    pctEl2.textContent = Math.floor(pct) + '%';
  }, 150);
}

function restoreBackup(i){
  const b = backups[i];
  showToast(`Memulihkan dunia dari backup ${b.time}...`);
  if(serverState === 'online'){
    consoleLine(`Dunia dipulihkan dari <span class="tag2">backup ${b.time}</span>.`);
  }
}

function removeBackup(i){
  backups.splice(i, 1);
  renderBackups();
  showToast('Backup dihapus.');
}

function startAutoBackup(){
  stopAutoBackup();
  const spec = tierSpecs[currentTier];
  if(!spec.backupIntervalMs) return; // paket Free: manual saja
  autoBackupInterval = setInterval(()=>{
    if(serverState !== 'online'){ stopAutoBackup(); return; }
    backups.unshift({ time: nowLabel(), size: (Math.random()*30+5).toFixed(1) + ' MB', auto: true });
    renderBackups();
    consoleLine('💾 Backup otomatis dunia tersimpan.');
  }, spec.backupIntervalMs);
}

function stopAutoBackup(){
  clearInterval(autoBackupInterval);
  autoBackupInterval = null;
}

function restartAutoBackup(){
  if(serverState === 'online') startAutoBackup();
}

function applyBackupAccess(tierName){
  const box = document.getElementById('backupBox');
  const lockedHint = document.getElementById('backupLockedHint');
  if(tierName === 'Free'){
    box.style.display = 'none';
    lockedHint.style.display = 'block';
    stopAutoBackup();
  } else {
    box.style.display = 'block';
    lockedHint.style.display = 'none';
  }
}

renderBackups();

/* ============ PLUGIN SERVER (semua paket) ============ */
let plugins = [
  { name: 'AntiCheat-Basic.jar', active: true },
  { name: 'TPA-Request.jar', active: true },
  { name: 'ScoreboardPlus.jar', active: false }
];

function renderPlugins(){
  const list = document.getElementById('pluginList');
  list.innerHTML = '';
  if(plugins.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada plugin. Tambahkan lewat kolom di atas.</div>';
    return;
  }
  plugins.forEach((p, i)=>{
    const row = document.createElement('div');
    row.className = 'item-row' + (p.active ? '' : ' inactive');
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">🧩 ${p.name}</div>
        <div class="item-meta">${p.active ? '<span class="badge-active">AKTIF</span>' : 'nonaktif'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn ${p.active ? '' : 'active-btn'}" onclick="togglePlugin(${i})">${p.active ? 'NONAKTIFKAN' : 'AKTIFKAN'}</button>
        <button class="mini-btn danger-btn" onclick="removePlugin(${i})">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

function togglePlugin(i){
  plugins[i].active = !plugins[i].active;
  renderPlugins();
  showToast(plugins[i].active ? `${plugins[i].name} diaktifkan.` : `${plugins[i].name} dinonaktifkan.`);
}

function removePlugin(i){
  const name = plugins[i].name;
  plugins.splice(i, 1);
  renderPlugins();
  showToast(`${name} dihapus.`);
}

function addManualPlugin(){
  const input = document.getElementById('pluginManualInput');
  const name = input.value.trim();
  if(!name){
    showToast('Isi dulu nama plugin-nya.');
    return;
  }
  if(!/\.(jar|zip|phar)$/i.test(name)){
    showToast('Nama file plugin harus berakhiran .jar, .zip, atau .phar');
    return;
  }
  plugins.unshift({ name: name, active: true });
  renderPlugins();
  input.value = '';
  showToast(`Plugin "${name}" berhasil ditambahkan & diaktifkan.`);
}

renderPlugins();

/* ============ ADD-ON & MAP MANAGER ============ */
let addons = [
  { name: 'better-mobs-pack.mcaddon', size: '3.2 MB', active: true },
  { name: 'faithful-32x.mcpack', size: '18.4 MB', active: true }
];
let maps = [
  { name: 'world-survival-01.mcworld', size: '64 MB', active: true },
  { name: 'creative-lobby.mcworld', size: '21 MB', active: false }
];

function renderAddons(){
  const list = document.getElementById('addonList');
  list.innerHTML = '';
  if(addons.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada add-on. Upload dulu di atas.</div>';
    return;
  }
  addons.forEach((item, i)=>{
    const row = document.createElement('div');
    row.className = 'item-row' + (item.active ? '' : ' inactive');
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.size} ${item.active ? '· <span class="badge-active">AKTIF</span>' : '· nonaktif'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn ${item.active ? '' : 'active-btn'}" onclick="toggleAddon(${i})">${item.active ? 'NONAKTIFKAN' : 'AKTIFKAN'}</button>
        <button class="mini-btn danger-btn" onclick="removeAddon(${i})">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

function renderMaps(){
  const list = document.getElementById('mapList');
  list.innerHTML = '';
  if(maps.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada map. Upload dulu di atas.</div>';
    return;
  }
  maps.forEach((item, i)=>{
    const row = document.createElement('div');
    row.className = 'item-row map-row' + (item.active ? '' : ' inactive');
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.size} ${item.active ? '· <span class="badge-active">DUNIA AKTIF</span>' : '· cadangan'}</div>
      </div>
      <div class="item-actions">
        ${item.active ? '' : `<button class="mini-btn active-btn" onclick="setActiveMap(${i})">JADIKAN AKTIF</button>`}
        <button class="mini-btn danger-btn" onclick="removeMap(${i})">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

function openGoogleDrive(type){
  window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener');
  showToast(type === 'addon'
    ? 'Google Drive dibuka di tab baru. Pilih file add-on, lalu tambahkan namanya di kolom manual.'
    : 'Google Drive dibuka di tab baru. Pilih file map, lalu tambahkan namanya di kolom manual.');
}

function randomSize(min, max){
  return (Math.random()*(max-min)+min).toFixed(1) + ' MB';
}

function addManualAddon(){
  const input = document.getElementById('addonManualInput');
  const name = input.value.trim();
  if(!name){
    showToast('Isi dulu nama file add-on-nya.');
    return;
  }
  if(!/\.(mcpack|mcaddon|zip)$/i.test(name)){
    showToast('Nama file harus berakhiran .mcpack, .mcaddon, atau .zip');
    return;
  }
  addons.unshift({ name: name, size: randomSize(1, 40), active: true });
  renderAddons();
  input.value = '';
  showToast(`Add-on "${name}" berhasil ditambahkan.`);
}

function addManualMap(){
  const input = document.getElementById('mapManualInput');
  const name = input.value.trim();
  if(!name){
    showToast('Isi dulu nama file map-nya.');
    return;
  }
  if(!/\.(mcworld|zip)$/i.test(name)){
    showToast('Nama file harus berakhiran .mcworld atau .zip');
    return;
  }
  maps.forEach(m=>m.active=false);
  maps.unshift({ name: name, size: randomSize(5, 150), active: true });
  renderMaps();
  input.value = '';
  showToast(`Map "${name}" berhasil ditambahkan & dijadikan dunia aktif.`);
}

function toggleAddon(i){
  addons[i].active = !addons[i].active;
  renderAddons();
  showToast(addons[i].active ? `${addons[i].name} diaktifkan.` : `${addons[i].name} dinonaktifkan.`);
}
function removeAddon(i){
  const name = addons[i].name;
  addons.splice(i,1);
  renderAddons();
  showToast(`${name} dihapus.`);
}
function setActiveMap(i){
  maps.forEach(m=>m.active=false);
  maps[i].active = true;
  renderMaps();
  showToast(`${maps[i].name} dijadikan dunia aktif. Restart server untuk menerapkan.`);
}
function removeMap(i){
  if(maps[i].active){
    showToast('Tidak bisa hapus map yang sedang aktif. Aktifkan map lain dulu.');
    return;
  }
  const name = maps[i].name;
  maps.splice(i,1);
  renderMaps();
  showToast(`${name} dihapus.`);
}

function handleUpload(type, inputEl){
  const file = inputEl.files[0];
  if(!file) return;

  const wrap = document.getElementById(type + 'ProgressWrap');
  const nameEl = document.getElementById(type + 'FileName');
  const bar = document.getElementById(type + 'ProgressBar');

  wrap.classList.add('show');
  nameEl.textContent = 'Mengunggah ' + file.name + '...';
  bar.style.width = '0%';

  let pct = 0;
  const sizeLabel = (file.size / (1024*1024)).toFixed(1) + ' MB';
  const timer = setInterval(()=>{
    pct += Math.random()*22 + 10;
    if(pct >= 100){
      pct = 100;
      clearInterval(timer);
      nameEl.textContent = file.name + ' — selesai!';
      setTimeout(()=>{
        wrap.classList.remove('show');
        inputEl.value = '';
        if(type === 'addon'){
          addons.unshift({ name: file.name, size: sizeLabel, active: true });
          renderAddons();
          showToast(`Add-on "${file.name}" berhasil diupload & diaktifkan.`);
        } else {
          maps.forEach(m=>m.active=false);
          maps.unshift({ name: file.name, size: sizeLabel, active: true });
          renderMaps();
          showToast(`Map "${file.name}" berhasil diupload & dijadikan dunia aktif.`);
        }
      }, 500);
    }
    bar.style.width = pct + '%';
  }, 180);
}

// drag & drop visual feedback
['addonDrop','mapDrop'].forEach(id=>{
  const box = document.getElementById(id);
  ['dragenter','dragover'].forEach(evt=>{
    box.addEventListener(evt, e=>{ e.preventDefault(); box.classList.add('dragover'); });
  });
  ['dragleave','drop'].forEach(evt=>{
    box.addEventListener(evt, e=>{ e.preventDefault(); box.classList.remove('dragover'); });
  });
  box.addEventListener('drop', e=>{
    const file = e.dataTransfer.files[0];
    if(!file) return;
    const input = box.querySelector('input[type=file]');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleUpload(id === 'addonDrop' ? 'addon' : 'map', input);
  });
});

renderAddons();
renderMaps();

/* ============ CONTENT TABS (Konten Saya / Tambang) ============ */
function showContentTab(tab){
  document.querySelectorAll('.ctab').forEach(t=>t.classList.toggle('active', t.dataset.ctab === tab));
  document.getElementById('ctab-milik').classList.toggle('active', tab === 'milik');
  document.getElementById('ctab-tambang').classList.toggle('active', tab === 'tambang');
}

/* Geser (swipe) kiri/kanan untuk pindah antar tab Konten Saya <-> Tambang Konten Baru */
/* Geser (swipe) kiri/kanan HANYA untuk perangkat sentuh (Android/HP) — beralih antara ADD-ON dan MAP.
   Di desktop (mouse/trackpad), Add-on & Map tetap tampil berdampingan seperti biasa, fitur ini tidak aktif. */
(function initAddonMapSwipe(){
  const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if(!isTouchDevice) return;

  const wrap = document.getElementById('addonMapWrap');
  if(!wrap) return;
  document.body.classList.add('is-touch-device');

  const panelOrder = ['addon', 'map'];
  let startX = 0, startY = 0, tracking = false;

  wrap.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    tracking = true;
  }, { passive:true });

  wrap.addEventListener('touchend', (e)=>{
    if(!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const deltaX = t.clientX - startX;
    const deltaY = Math.abs(t.clientY - startY);
    if(deltaY > 60 || Math.abs(deltaX) < 55) return;

    const activeBtn = document.querySelector('.addon-map-tab.active');
    if(!activeBtn) return;
    const currentIndex = panelOrder.indexOf(activeBtn.dataset.panel);

    if(deltaX < 0 && currentIndex < panelOrder.length - 1){
      showAddonMapPanel(panelOrder[currentIndex + 1]); // geser ke kiri -> panel berikutnya
    } else if(deltaX > 0 && currentIndex > 0){
      showAddonMapPanel(panelOrder[currentIndex - 1]); // geser ke kanan -> panel sebelumnya
    }
  }, { passive:true });
})();

function showAddonMapPanel(panel){
  document.querySelectorAll('.addon-map-tab').forEach(t=>t.classList.toggle('active', t.dataset.panel === panel));
  document.getElementById('addonBox').classList.toggle('active', panel === 'addon');
  document.getElementById('mapBox').classList.toggle('active', panel === 'map');
}

/* ============ MANAJER FILE ============ */
const fmFiles = {
  'level.dat': {
    content: '[FILE BINER — level.dat]\n\nFile ini menyimpan data mentah dunia (seed, koordinat spawn, waktu game, aturan permainan) dalam format biner, bukan teks.\nTidak bisa diedit langsung di sini — gunakan export/import dunia lewat menu Add-on & Map.',
    readonly: true, badge: 'BINER'
  },
  'playerdata': {
    content: '[FOLDER] playerdata/\n\nBerisi file .dat per pemain (inventori, posisi, health, XP).\nUntuk mengedit data pemain per akun, gunakan tab DATABASE PEMAIN di sebelah — datanya ditampilkan dalam bentuk tabel yang lebih mudah dibaca.',
    readonly: true, badge: 'FOLDER'
  },
  'plugin-example': {
    content: '[FILE BINER — EssentialsPMMP.phar]\n\nPlugin siap pakai untuk PocketMine-MP/Nukkit (perintah dasar, teleport, economy, dll).\nUpload plugin baru dengan drag & drop file .phar (PocketMine-MP) atau .jar (Nukkit) ke folder ini — hanya aktif kalau Software Server bukan "Bedrock Dedicated Server (Vanilla)", karena versi vanilla resmi Mojang tidak mendukung plugin pihak ketiga.',
    readonly: true, badge: 'PLUGIN'
  },
  'server.properties': {
    content: 'server-name=BlockHost Survival\ngamemode=survival\ndifficulty=normal\nallow-cheats=false\nmax-players=20\nonline-mode=true\nwhite-list=false\nserver-port=19132\nview-distance=32\ntick-distance=4\nlevel-name=world-survival-01\ndefault-player-permission-level=member',
    readonly: false, badge: 'TEXT'
  },
  'permissions.json': {
    content: '[\n  { "permission": "operator", "xuid": "2535400000000001" },\n  { "permission": "member", "xuid": "2535400000000002" },\n  { "permission": "visitor", "xuid": "2535400000000003" }\n]',
    readonly: false, badge: 'JSON'
  },
  'allowlist.json': {
    content: '[\n  { "name": "Steve Craft", "ignoresPlayerLimit": false },\n  { "name": "Alex Miner", "ignoresPlayerLimit": false }\n]',
    readonly: false, badge: 'JSON'
  },
  'latest.log': {
    content: '[12:00:01 INFO] Starting Server\n[12:00:03 INFO] Server started.\n[12:04:11 INFO] Player Steve Craft connected\n[12:15:42 INFO] Player Alex Miner connected\n[13:02:09 INFO] Autosave dunia selesai.',
    readonly: true, badge: 'LOG'
  }
};
let currentFmFile = 'server.properties';

function openFmFile(fileKey){
  currentFmFile = fileKey;
  const file = fmFiles[fileKey];
  document.querySelectorAll('.fm-file-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.file === fileKey);
  });
  document.getElementById('fmEditorName').textContent = fileKey === 'playerdata' ? 'playerdata/' : fileKey;
  document.getElementById('fmEditorBadge').textContent = file.badge;
  const editor = document.getElementById('fmEditor');
  editor.value = file.content;
  editor.readOnly = file.readonly;
  document.getElementById('fmSaveBtn').style.display = file.readonly ? 'none' : 'inline-block';
}

function saveFmFile(){
  const file = fmFiles[currentFmFile];
  if(file.readonly) return;
  file.content = document.getElementById('fmEditor').value;
  showToast(`"${currentFmFile}" berhasil disimpan. Restart server agar perubahan berlaku.`);
}

function showFmTab(tab){
  document.querySelectorAll('.fmtab').forEach(t=>t.classList.toggle('active', t.dataset.fmtab === tab));
  document.getElementById('fmtab-files').classList.toggle('active', tab === 'files');
  document.getElementById('fmtab-database').classList.toggle('active', tab === 'database');
}

/* Inisialisasi editor dengan file default */
const fmEditorInit = document.getElementById('fmEditor');
if(fmEditorInit){
  fmEditorInit.value = fmFiles[currentFmFile].content;
  fmEditorInit.readOnly = fmFiles[currentFmFile].readonly;
}

/* ============ DATABASE PEMAIN ============ */
let playerDatabase = [
  { name: 'Steve Craft',   uuid: '2535400000000001', mode: 'survival', playtime: '18j 24m', lastJoin: '25 Jul 2026', banned: false },
  { name: 'Alex Miner',    uuid: '2535400000000002', mode: 'creative', playtime: '7j 05m',  lastJoin: '24 Jul 2026', banned: false },
  { name: 'Herobrine Dev', uuid: '2535400000000003', mode: 'survival', playtime: '2j 40m',  lastJoin: '20 Jul 2026', banned: true }
];

function renderPlayerDatabase(){
  const tbody = document.getElementById('dbPlayerTable');
  if(!tbody) return;
  tbody.innerHTML = '';
  playerDatabase.forEach((p, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.uuid}</td>
      <td>
        <select onchange="changePlayerMode(${i}, this.value)">
          <option value="survival" ${p.mode==='survival'?'selected':''}>Survival</option>
          <option value="creative" ${p.mode==='creative'?'selected':''}>Creative</option>
          <option value="adventure" ${p.mode==='adventure'?'selected':''}>Adventure</option>
        </select>
      </td>
      <td>${p.playtime}</td>
      <td>${p.lastJoin}</td>
      <td class="${p.banned ? 'db-status-banned' : 'db-status-ok'}">${p.banned ? 'DIBANNED' : 'AKTIF'}</td>
      <td class="db-actions">
        <button class="mini-btn danger-btn" onclick="kickPlayer(${i})">KICK</button>
        <button class="mini-btn ${p.banned ? 'active-btn' : 'danger-btn'}" onclick="toggleBanPlayer(${i})">${p.banned ? 'UNBAN' : 'BAN'}</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function changePlayerMode(i, mode){
  playerDatabase[i].mode = mode;
  showToast(`Mode permainan ${playerDatabase[i].name} diubah ke ${mode}.`);
}
function kickPlayer(i){
  showToast(`${playerDatabase[i].name} dikeluarkan dari server.`);
}
function toggleBanPlayer(i){
  playerDatabase[i].banned = !playerDatabase[i].banned;
  renderPlayerDatabase();
  showToast(`${playerDatabase[i].name} ${playerDatabase[i].banned ? 'diban' : 'di-unban'}.`);
}

renderPlayerDatabase();


const tierInfo = {
  batu:    { label: 'BATU',    time: 1200, icon: '⛏' },
  besi:    { label: 'BESI',    time: 2200, icon: '⛏' },
  emas:    { label: 'EMAS',    time: 3400, icon: '⛏' },
  berlian: { label: 'BERLIAN', time: 5200, icon: '⛏' }
};

const addonCatalog = [
  { name: 'torch-light-fix.mcpack', tier: 'batu', size: '1.1 MB', desc: 'Perbaikan kecerahan obor.' },
  { name: 'custom-mobs-lite.mcaddon', tier: 'besi', size: '6.4 MB', desc: 'Mob baru dengan tekstur unik.' },
  { name: 'shader-glow-pack.mcpack', tier: 'emas', size: '22 MB', desc: 'Efek cahaya & bayangan realistis.' },
  { name: 'ultra-realistic-rtx.mcaddon', tier: 'berlian', size: '88 MB', desc: 'Grafis definisi tinggi, sangat langka.' }
];

const mapCatalog = [
  { name: 'flat-creative.mcworld', tier: 'batu', size: '8 MB', desc: 'Dunia datar untuk membangun bebas.' },
  { name: 'skyblock-classic.mcworld', tier: 'besi', size: '34 MB', desc: 'Pulau kecil di langit, tantangan bertahan hidup.' },
  { name: 'mega-city-rp.mcworld', tier: 'emas', size: '120 MB', desc: 'Kota besar untuk roleplay bersama teman.' },
  { name: 'custom-dragon-realm.mcworld', tier: 'berlian', size: '240 MB', desc: 'Dunia custom epik, sangat langka.' }
];

function renderOreGrid(catalog, type){
  const grid = document.getElementById(type === 'addon' ? 'addonOreGrid' : 'mapOreGrid');
  grid.innerHTML = '';
  catalog.forEach((item, i)=>{
    const t = tierInfo[item.tier];
    const card = document.createElement('div');
    card.className = `ore-card tier-${item.tier}`;
    card.innerHTML = `
      <div class="ore-top">
        <div class="ore-icon tier-${item.tier}">${t.icon}</div>
        <div style="min-width:0;">
          <div class="ore-name">${item.name}</div>
          <div class="ore-meta">${item.size} · ${item.desc}</div>
        </div>
        <div class="ore-tier-badge tier-${item.tier}">${t.label}</div>
      </div>
      <button class="btn btn-ghost mine-btn" id="${type}Mine${i}Btn" onclick="mineItem('${type}', ${i})">⛏ TAMBANG</button>
      <div class="mine-progress-wrap" id="${type}Mine${i}Wrap">
        <div class="mine-progress-label"><span><span class="pickaxe">⛏</span> Menambang...</span><span id="${type}Mine${i}Pct">0%</span></div>
        <div class="bar-track"><div class="bar-fill mine" id="${type}Mine${i}Bar"></div></div>
      </div>`;
    grid.appendChild(card);
  });
}
renderOreGrid(addonCatalog, 'addon');
renderOreGrid(mapCatalog, 'map');
applyTierSpecs(currentTier);
updateLoginUI();

function mineItem(type, i){
  const catalog = type === 'addon' ? addonCatalog : mapCatalog;
  const item = catalog[i];
  const t = tierInfo[item.tier];
  const btn = document.getElementById(`${type}Mine${i}Btn`);
  const wrap = document.getElementById(`${type}Mine${i}Wrap`);
  const bar = document.getElementById(`${type}Mine${i}Bar`);
  const pctEl = document.getElementById(`${type}Mine${i}Pct`);

  btn.disabled = true;
  btn.textContent = 'SEDANG MENAMBANG...';
  wrap.classList.add('show');
  bar.style.width = '0%';

  const startTime = Date.now();
  const duration = t.time;
  const timer = setInterval(()=>{
    const elapsed = Date.now() - startTime;
    let pct = Math.min(100, Math.round((elapsed/duration)*100));
    bar.style.width = pct + '%';
    pctEl.textContent = pct + '%';
    if(pct >= 100){
      clearInterval(timer);
      wrap.classList.remove('show');
      btn.disabled = false;
      btn.textContent = '⛏ TAMBANG LAGI';

      if(type === 'addon'){
        addons.unshift({ name: item.name, size: item.size, active: true });
        renderAddons();
      } else {
        maps.forEach(m=>m.active=false);
        maps.unshift({ name: item.name, size: item.size, active: true });
        renderMaps();
      }
      showToast(`Berhasil menambang "${item.name}" (tier ${t.label})!`);
    }
  }, 120);
}

function startPlayerSim(){
  const rawSlots = tierSpecs[currentTier].slots;
  const isUnlimited = rawSlots === 'Unlimited';
  const capNum = isUnlimited ? 250 : rawSlots;
  const slotsLabel = isUnlimited ? '∞' : rawSlots;

  let count = Math.floor(Math.random()*Math.min(5, capNum))+1;
  document.getElementById('playerCount').textContent = count + ' / ' + slotsLabel;
  playerInterval = setInterval(()=>{
    if(serverState !== 'online'){ clearInterval(playerInterval); return; }
    count += Math.random() > 0.5 ? 1 : -1;
    count = Math.max(0, Math.min(capNum, count));
    document.getElementById('playerCount').textContent = count + ' / ' + slotsLabel;
    animateBars('up');
  }, 3000);
}