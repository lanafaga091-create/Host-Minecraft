function changeBedrockVersion(version){
  showToast(`Versi server diubah ke Bedrock ${version}. Restart server untuk menerapkan.`);
  if(serverState === 'online'){
    consoleLine(`Versi server dijadwalkan berubah ke <span class="tag2">${version}</span> saat restart berikutnya.`);
  }
}

function changeServerSoftware(software){
  const labels = {
    bds: 'Bedrock Dedicated Server (Vanilla) — tanpa dukungan plugin, hanya mendukung Add-on resmi.',
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

/* ============ MICRO-INTERACTION: fade-in halus saat scroll ============ */
let __revealObserver = null;
function initScrollReveal(){
  const targets = document.querySelectorAll(
    '.card, .tier, .stat, .panel-box, .ore-card, .vip-card, .faq-item, .contact-grid > div'
  );
  targets.forEach(el=>{ if(!el.classList.contains('reveal')) el.classList.add('reveal'); });

  if(!__revealObserver){
    __revealObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          __revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
  }
  document.querySelectorAll('.reveal:not(.in-view)').forEach(el=>__revealObserver.observe(el));
}

/* ============ MICRO-INTERACTION: parallax ringan pada visual hero ============ */
function initHeroParallax(){
  const stack = document.querySelector('.hero-visual .voxel-stack');
  if(!stack) return;
  let ticking = false;
  window.addEventListener('scroll', ()=>{
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const beranda = document.getElementById('beranda');
      if(beranda && beranda.classList.contains('active')){
        const offset = Math.min(window.scrollY, 400);
        stack.style.transform = `translateY(${offset * 0.12}px)`;
      }
      ticking = false;
    });
  }, { passive:true });
}

window.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initHeroParallax();
});

/* ============ NAV / PAGE SWITCH ============ */
let panelUnlocked = false;

function isPackageExpired(){
  return !!(packageExpiryDate && packageExpiryDate <= new Date());
}

function showPage(id){
  if(id === 'panel' && !isLoggedIn){
    pendingPageAfterLogin = 'panel';
    openLoginModal();
    return;
  }
  if(id === 'panel' && (!panelUnlocked || isPackageExpired())){
    if(!pendingTier) pendingTier = currentTier;
    if(pendingTier === 'Free' && isPackageExpired()){
      showToast('Waktu paket Free (30 menit) telah habis. Pilih paket untuk melanjutkan.');
      showPage('paket');
      return;
    }
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
  initScrollReveal();
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
let registeredUsers = []; // { name, email, passObfuscated } — disimpan lokal di browser (localStorage), tidak pernah dikirim ke server mana pun

const avatarColors = ['#4285F4','#EA4335','#34A853','#F4B400','#9334E6','#00ACC1'];

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
  loginOverlay.classList.add('show');
}
function closeLoginModal(){
  loginOverlay.classList.remove('show');
  pendingPageAfterLogin = null;
}

/* Dipakai khusus oleh tombol ✕ — pengguna membatalkan login secara eksplisit */
function cancelLoginModal(){
  pendingFreeTierAfterLogin = false;
  closeLoginModal();
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

/* Daftar akun baru — disimpan di server (data/users.json), otomatis masuk begitu berhasil */
async function registerAccount(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const agree = document.getElementById('regAgree').checked;

  if(!name){ showToast('Lengkapi nama Anda terlebih dahulu.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Masukkan alamat email yang valid.'); return; }
  if(password.length < 6){ showToast('Kata sandi minimal 6 karakter.'); return; }
  if(!agree){ showToast('Centang dulu persetujuan Syarat & Ketentuan sebelum lanjut.'); return; }

  showToast(`Mendaftarkan akun ${name}...`);
  try{
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await resp.json();
    if(!data.ok){
      if(/sudah terdaftar/i.test(data.error || '')){
        showToast('Email sudah terdaftar. Silakan masuk lewat tab MASUK.');
        switchLoginTab('masuk');
        document.getElementById('loginEmail2').value = email;
      } else {
        showToast(data.error || 'Gagal mendaftar. Coba lagi.');
      }
      return;
    }
    const color = avatarColors[Math.floor(Math.random()*avatarColors.length)];
    completeLogin({ name: data.user.name, email: data.user.email, color, joined: data.user.joined, tier: data.user.tier, tierExpiry: data.user.tierExpiry, freeTrialUsed: data.user.freeTrialUsed }, `Berhasil daftar & masuk sebagai ${name}!`);
  }catch(e){
    showToast('Tidak bisa menghubungi server. Pastikan server.js sedang berjalan.');
  }
}

function formatJoinDate(){
  return new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}

/* Masuk dengan akun yang sudah terdaftar */
let resetTargetEmail = null;

function forgotPassword(){
  const email = document.getElementById('loginEmail2').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showToast('Lengkapi email Anda pada kolom Email sebelum menekan "Lupa kata sandi?".');
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
  saveRegisteredUsers();
  showToast('Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru Anda.');
  closeResetPassword();

  document.getElementById('loginEmail2').value = user.email;
  document.getElementById('loginPassword2').value = '';
}

async function loginAccount(){
  const email = document.getElementById('loginEmail2').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword2').value;
  const agree = document.getElementById('loginAgree2').checked;

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showToast('Masukkan alamat email yang valid.'); return; }
  if(!password){ showToast('Lengkapi kata sandi Anda terlebih dahulu.'); return; }
  if(!agree){ showToast('Centang dulu persetujuan Syarat & Ketentuan sebelum lanjut.'); return; }

  showToast('Memeriksa akun...');
  try{
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if(!data.ok){
      if(/belum terdaftar/i.test(data.error || '')){
        showToast('Email belum terdaftar. Silakan daftar dulu lewat tab DAFTAR.');
        switchLoginTab('daftar');
        document.getElementById('regEmail').value = email;
      } else {
        showToast(data.error || 'Kata sandi salah. Coba lagi.');
      }
      return;
    }
    const color = avatarColors[Math.floor(Math.random()*avatarColors.length)];
    const user = data.user;
    const loginUser = { name: user.name, email: user.email, color, joined: user.joined, tier: user.tier, tierExpiry: user.tierExpiry, freeTrialUsed: user.freeTrialUsed };
    const regUser = registeredUsers.find(u => u.email === email);
    if(regUser && regUser.twoFAEnabled){
      closeLoginModal();
      startTwoFAVerification(loginUser);
      return;
    }
    completeLogin(loginUser, `Masuk sebagai ${user.name}!`);
  }catch(e){
    showToast('Tidak bisa menghubungi server. Pastikan server.js sedang berjalan.');
  }
}

function completeLogin(user, message){
  const shouldTryFreeTier = pendingFreeTierAfterLogin;
  pendingFreeTierAfterLogin = false;
  isLoggedIn = true;
  currentUser = user;
  applyTierFromServer(user);
  updateLoginUI();
  saveAuthState();
  closeLoginModal();
  closeTwoFAModal();
  showToast(message || `Berhasil masuk sebagai ${user.name}!`);
  startTierPolling();
  if(shouldTryFreeTier){
    selectTier('Free');
    return;
  }
  if(pendingPageAfterLogin){
    const target = pendingPageAfterLogin;
    pendingPageAfterLogin = null;
    showPage(target);
  }
}

/* ============ SINKRONISASI STATUS PAKET DENGAN SERVER ============
   Status tier akun (Free/Batu/Besi/Emas/Berlian) sekarang milik server
   (data/users.json), bukan localStorage lagi. Ini supaya saat admin
   mengonfirmasi pembayaran lewat payment-confirm, panel otomatis
   ter-update tanpa perlu localStorage cocok di HP yang sama. */
function applyTierFromServer(user){
  if(!user || !user.tier || !tierSpecs[user.tier]) return;
  const wasUnlocked = panelUnlocked;
  currentTier = user.tier;
  packageExpiryDate = user.tierExpiry ? new Date(user.tierExpiry) : null;
  if(user.freeTrialUsed) freeTrialUsedEmails = Array.from(new Set([...freeTrialUsedEmails, user.email]));
  const stillActive = !packageExpiryDate || packageExpiryDate.getTime() > Date.now();
  if(stillActive && (packageExpiryDate || user.tier !== 'Belum ada paket')){
    panelUnlocked = true;
    applyTierSpecs(currentTier);
  }
  saveAppState();
  if(panelUnlocked && !wasUnlocked){
    const gateWasOpen = qrisGateOverlay && qrisGateOverlay.classList.contains('show');
    closePaymentGate();
    showToast(`Pembayaran dikonfirmasi! Paket ${currentTier.toUpperCase()} aktif.`);
    if(gateWasOpen) showPage('panel');
  }
}

let tierPollTimer = null;
function startTierPolling(){
  if(tierPollTimer) clearInterval(tierPollTimer);
  tierPollTimer = setInterval(async ()=>{
    if(!isLoggedIn || !currentUser) return;
    try{
      const resp = await fetch(`/api/tier?email=${encodeURIComponent(currentUser.email)}`);
      const data = await resp.json();
      if(data.ok) applyTierFromServer(Object.assign({}, currentUser, data.user));
    }catch(e){
      // server sedang tidak bisa dihubungi — coba lagi di siklus berikutnya
    }
  }, 5000);
}

/* ============ PERSISTENSI AKUN TERDAFTAR (localStorage) ============ */
const USERS_STORAGE_KEY = 'blockhost_registered_users';

function saveRegisteredUsers(){
  try{
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(registeredUsers));
  }catch(e){
    // localStorage tidak tersedia — lewati, data akun hanya bertahan untuk sesi ini
  }
}

function loadRegisteredUsers(){
  try{
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(Array.isArray(data)) registeredUsers = data;
  }catch(e){
    // data tersimpan rusak/tidak valid — mulai dari daftar akun kosong
  }
}

/* ============ PERSISTENSI LOGIN (localStorage) ============ */
const AUTH_STORAGE_KEY = 'blockhost_auth_state';

function saveAuthState(){
  try{
    if(isLoggedIn && currentUser){
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isLoggedIn, currentUser }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }catch(e){
    // localStorage tidak tersedia — lewati, login tetap jalan untuk sesi ini saja
  }
}

function loadAuthState(){
  try{
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data && data.isLoggedIn && data.currentUser && data.currentUser.email){
      isLoggedIn = true;
      currentUser = data.currentUser;
    }
  }catch(e){
    // data tersimpan rusak/tidak valid — abaikan, mulai dari kondisi belum login
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
  showToast(`Kode verifikasi (belum ada email sungguhan): ${pendingTwoFACode}`);
}

function closeTwoFAModal(){
  document.getElementById('twoFAOverlay').classList.remove('show');
  pendingTwoFAUser = null;
  pendingTwoFACode = null;
}

function resendTwoFACode(){
  if(!pendingTwoFAUser) return;
  pendingTwoFACode = String(Math.floor(100000 + Math.random()*900000));
  showToast(`Kode verifikasi baru: ${pendingTwoFACode}`);
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
  saveAuthState();
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

  const avatarBig = document.getElementById('profileAvatarBig');
  avatarBig.style.background = currentUser.color;
  avatarBig.textContent = currentUser.name.charAt(0).toUpperCase();
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
    showToast('Lengkapi gamertag Xbox Live Anda terlebih dahulu.');
    return;
  }
  xboxGamertag = tag;
  updateXboxUI();
  showToast(`Akun Xbox Live "${tag}" berhasil ditautkan. Anda sekarang dapat bermain cross-play.`);
}

function changePasswordFromProfile(){
  if(!currentUser) return;
  const isRegisteredEmail = registeredUsers.some(u => u.email === currentUser.email);
  if(!isRegisteredEmail){
    showToast('Akun ini tidak ditemukan di data terdaftar. Coba masuk ulang.');
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
    showToast('2FA hanya bisa diatur untuk akun email/kata sandi BlockHost.');
    document.getElementById('toggle2FA').checked = false;
    return;
  }
  regUser.twoFAEnabled = checked;
  saveRegisteredUsers();
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
    login_title:'MASUK / DAFTAR AKUN',
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
    hero_h1:'Nyalakan server <span class="accent">Minecraft&nbsp;Bedrock</span> Anda dalam <span class="accent-gold">60 detik</span>',
    hero_desc:'SSD NVMe, proteksi anti-DDoS, dan panel kontrol sendiri — cocok untuk Anda yang bermain bersama teman lewat Xbox, PlayStation, mobile, atau Windows. Tanpa perlu memahami server, cukup satu klik untuk menyalakannya.',
    btn_start:'MULAI SEKARANG', btn_view_panel:'LIHAT PANEL',
    stat_uptime:'UPTIME', stat_setup:'WAKTU SETUP', stat_support:'DUKUNGAN',
    fitur_eyebrow:'FITUR LENGKAP', fitur_h1:'Semua yang dibutuhkan server Bedrock-mu',
    fitur_desc:'Dari proteksi keamanan sampai kontrol penuh atas dunia game Anda, semuanya sudah termasuk di setiap paket.',
    paket_eyebrow:'PILIH PAKET ANDA', paket_h1:'Paket hosting, disusun seperti resep crafting',
    paket_desc:'Semakin tinggi tier bahan, semakin besar kapasitas server. Bisa upgrade kapan saja lewat panel kontrol.',
    panel_eyebrow:'PRATINJAU INTERAKTIF', panel_h1:'Panel kontrol server Anda',
    panel_desc:'Berikut tampilan panel yang akan Anda gunakan untuk mengelola server Bedrock. Tekan tombol di bawah untuk mencobanya.',
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
    login_title:'SIGN IN / SIGN UP',
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
  saveRegisteredUsers();
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

const CONFIRM_PAY_BTN_DELAY_MS = 8000; // waktu tombol "SAYA SUDAH BAYAR" disembunyikan dulu
let confirmPayBtnTimer = null;

function openPaymentGate(){
  const tier = pendingTier || currentTier;
  document.getElementById('gateTierName').textContent = tier;
  document.getElementById('gateAmount').textContent = tierPrices[tier] || 'Rp0';
  document.getElementById('gateSub').textContent = isPackageExpired()
    ? `Paket ${tier} Anda telah kedaluwarsa. Selesaikan pembayaran untuk mengaktifkannya kembali dan membuka Panel Kontrol.`
    : `Selesaikan pembayaran paket ${tier} untuk membuka Panel Kontrol.`;
  generateFakeQR();
  document.getElementById('gateStatus').textContent = 'Menunggu pembayaran... Pindai kode QR di atas.';

  const btn = document.getElementById('confirmPayBtn');
  btn.disabled = false;
  btn.textContent = 'SAYA SUDAH BAYAR';
  btn.style.display = 'none';

  if(confirmPayBtnTimer) clearTimeout(confirmPayBtnTimer);
  confirmPayBtnTimer = setTimeout(()=>{
    btn.style.display = 'block';
    document.getElementById('gateStatus').textContent = 'Menunggu pembayaran...';
  }, CONFIRM_PAY_BTN_DELAY_MS);

  qrisGateOverlay.classList.add('show');
}
function closePaymentGate(){
  qrisGateOverlay.classList.remove('show');
  if(confirmPayBtnTimer){
    clearTimeout(confirmPayBtnTimer);
    confirmPayBtnTimer = null;
  }
}

// payment-confirm sekarang diakses lewat proxy internal panel (/api/payment/*
// dan /bayar/*), jadi tidak perlu tahu port/hostname payment-confirm lagi —
// ini otomatis tetap jalan baik diakses via WiFi lokal maupun lewat tunnel.
function paymentConfirmBaseUrl(){
  return '';
}

/* Tombol "SAYA SUDAH BAYAR" sekarang benar-benar mengirim pengajuan ke
   payment-confirm, BUKAN langsung membuka panel. Admin harus mengecek
   mutasi rekening dan menekan "Konfirmasi" di panel admin payment-confirm
   sebelum paket ini benar-benar aktif — panel di sini akan otomatis
   terbuka begitu status berubah (lewat polling /api/tier tiap 5 detik). */
async function confirmPayment(){
  if(!isLoggedIn || !currentUser){
    showToast('Masuk dulu sebelum mengonfirmasi pembayaran.');
    return;
  }
  const btn = document.getElementById('confirmPayBtn');
  const status = document.getElementById('gateStatus');
  const tierToApply = pendingTier || currentTier;

  const reference = prompt('Masukkan kode referensi / berita transfer dari m-banking kamu (biar admin gampang mengecek mutasinya):');
  if(!reference || !reference.trim()){
    showToast('Kode referensi wajib diisi supaya admin bisa mencocokkan transfer.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'MENGIRIM...';
  status.textContent = 'Mengirim pengajuan konfirmasi ke admin...';

  try{
    const resp = await fetch(`${paymentConfirmBaseUrl()}/api/payment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        name: currentUser.name,
        tier: tierToApply,
        price: tierPrices[tierToApply] || 'Rp0',
        reference: reference.trim(),
      }),
    });
    const data = await resp.json();
    if(!data.ok){
      status.textContent = data.error || 'Gagal mengirim pengajuan.';
      btn.disabled = false;
      btn.textContent = 'SAYA SUDAH BAYAR';
      return;
    }
    status.textContent = '📨 Pengajuan terkirim. Menunggu admin memeriksa & mengonfirmasi pembayaran...';
    btn.textContent = 'MENUNGGU KONFIRMASI ADMIN';
    showToast('Pengajuan pembayaran terkirim! Panel akan terbuka otomatis begitu admin mengonfirmasi.');
  }catch(e){
    status.textContent = 'Tidak bisa menghubungi server payment-confirm.';
    btn.disabled = false;
    btn.textContent = 'SAYA SUDAH BAYAR';
    showToast('Pastikan payment-confirm juga sedang dijalankan (node server.js di folder payment-confirm).');
  }
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
  const btn = e.target.closest('.btn, .navtab, .ctab, .fmtab, .addon-map-tab, .mini-btn, .copy-btn, .faq-q, .side-link, .hamburger, .gate-close, .gdrive-btn, .login-btn, .login-tab, .toggle-pw, .footer-social-btn, .profile-danger-link');
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
let packageExpiryDate = null; // null = tidak ada masa berlaku
const FREE_TIER_DURATION_MS = 30 * 60 * 1000; // paket Free hanya berjalan 30 menit
let freeTrialUsedEmails = []; // email akun yang sudah pernah memakai jatah paket Free
let pendingFreeTierAfterLogin = false;

/* ============ PERSISTENSI STATUS PAKET (real-world days) ============ */
const STORAGE_KEY = 'blockhost_package_state';

function saveAppState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentTier,
      packageExpiryDate: packageExpiryDate ? packageExpiryDate.toISOString() : null,
      panelUnlocked,
      transactionHistory,
      freeTrialUsedEmails
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
    if(Array.isArray(data.freeTrialUsedEmails)) freeTrialUsedEmails = data.freeTrialUsedEmails;
  }catch(e){
    // data tersimpan rusak/tidak valid — abaikan, mulai dari kondisi awal
  }
}
loadAppState();
loadRegisteredUsers();
loadAuthState();
if(isLoggedIn && currentUser && currentUser.email){
  updateLoginUI();
  fetch(`/api/tier?email=${encodeURIComponent(currentUser.email)}`)
    .then(r => r.json())
    .then(data => { if(data.ok) applyTierFromServer(Object.assign({}, currentUser, data.user)); })
    .catch(()=>{});
  startTierPolling();
}

/* Cek berkala agar panel otomatis terkunci saat paket (terutama Free, 30 menit) habis masa aktifnya */
setInterval(()=>{
  if(!panelUnlocked || !packageExpiryDate) return;
  renderExpiryNotice();
  const panelPage = document.getElementById('panel');
  if(!isPackageExpired() || !panelPage || !panelPage.classList.contains('active')) return;

  if(!pendingTier) pendingTier = currentTier;

  if(currentTier === 'Free'){
    showToast('Waktu paket Free (30 menit) telah habis. Pilih paket untuk melanjutkan.');
    showPage('paket');
    return;
  }

  if(!qrisGateOverlay.classList.contains('show')){
    showToast(`Paket ${currentTier} sudah kedaluwarsa.`);
    openPaymentGate();
  }
}, 1000);

async function selectTier(name){
  pendingTier = name;

  if(name === 'Free'){
    if(!isLoggedIn || !currentUser){
      pendingFreeTierAfterLogin = true;
      showToast('Masuk/daftar akun dulu untuk mencoba paket Free.');
      openLoginModal();
      return;
    }
    if(freeTrialUsedEmails.includes(currentUser.email) || currentUser.freeTrialUsed){
      showToast('Akun ini sudah pernah memakai jatah paket Free. Pilih paket berbayar untuk melanjutkan.');
      showPage('paket');
      return;
    }
    showToast('Mengaktifkan paket Free...');
    try{
      const resp = await fetch('/api/tier/free-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const data = await resp.json();
      if(!data.ok){ showToast(data.error || 'Gagal mengaktifkan paket Free.'); return; }
      currentUser.freeTrialUsed = true;
      applyTierFromServer(Object.assign({}, currentUser, data.user));
      logTransaction('Free', 'Rp0');
      showToast('Paket Free aktif! Langsung masuk ke Panel selama 30 menit.');
      setTimeout(()=>showPage('panel'), 500);
    }catch(e){
      showToast('Tidak bisa menghubungi server. Pastikan server.js sedang berjalan.');
    }
    return;
  }

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
    packageExpiryDate = new Date(Date.now() + FREE_TIER_DURATION_MS);
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
    textEl.textContent = `✅ Paket ${currentTier} tidak memiliki masa aktif.`;
    renewBtn.style.display = 'none';
    return;
  }

  notice.style.display = 'flex';

  if(currentTier === 'Free'){
    const msLeft = packageExpiryDate - new Date();
    const minutesLeft = Math.ceil(msLeft / 60000);
    if(minutesLeft > 5){
      notice.className = 'expiry-notice expiry-ok';
      textEl.textContent = `✅ Paket Free aktif, sisa ${minutesLeft} menit.`;
      renewBtn.style.display = 'none';
    } else if(minutesLeft > 0){
      notice.className = 'expiry-notice expiry-warning';
      textEl.textContent = `⚠ Paket Free akan berakhir dalam ${minutesLeft} menit.`;
      renewBtn.style.display = 'inline-block';
    } else {
      notice.className = 'expiry-notice expiry-expired';
      textEl.textContent = `⛔ Waktu paket Free (30 menit) telah habis. Pilih paket untuk melanjutkan.`;
      renewBtn.style.display = 'inline-block';
    }
    return;
  }

  const dateLabel = packageExpiryDate.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  const msPerDay = 1000*60*60*24;
  const daysLeft = Math.ceil((packageExpiryDate - new Date()) / msPerDay);

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
    selectTier('Free');
    return;
  }
  selectTier(currentTier);
}

function renderInvoiceHtml(){
  if(transactionHistory.length === 0){
    return '<p style="color:var(--text-dimmer);font-size:12.5px;">Belum ada transaksi. Riwayat akan muncul di sini setelah Anda memilih paket.</p>';
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

/* ============ ALAMAT SERVER (REAL, sama untuk semua paket — tidak ada lagi custom port) ============ */
let realConnectionInfo = null; // { ip, port, isPrivate } asli dari server (bukan domain contoh)

async function fetchConnectionInfo(){
  try{
    const resp = await fetch('/api/connection-info');
    const data = await resp.json();
    if(data.ok) realConnectionInfo = data;
  }catch(e){
    // server.js tidak bisa dihubungi — biarkan placeholder "Menghubungkan ke server..."
  }
  return realConnectionInfo;
}
function realAddressLabel(){
  if(realConnectionInfo && realConnectionInfo.ip){
    return `${realConnectionInfo.ip}:${realConnectionInfo.port}`;
  }
  return 'Menghubungkan ke server...';
}

// Dipanggil tiap kali paket/tier ganti — alamatnya sekarang selalu sama (real),
// tidak ada lagi versi "custom" khusus paket tertentu.
async function applyAddressFeature(){
  await fetchConnectionInfo();
  const ipText = document.getElementById('ipText');
  const hint = document.getElementById('addressReachHint');
  if(ipText) ipText.textContent = realAddressLabel();
  if(hint){
    if(realConnectionInfo && realConnectionInfo.isPrivate){
      hint.innerHTML = '📶 Alamat ini bisa dipakai HP/PC lain yang terhubung ke <b>WiFi yang sama</b> dengan HP host. Untuk main dari luar jaringan (internet), kamu perlu setting <b>port forwarding</b> di router, atau pakai layanan tunnel seperti <b>playit.gg</b> (mendukung Bedrock/UDP) — kebanyakan jaringan seluler tidak bisa diakses langsung dari luar karena CGNAT.';
    } else if(realConnectionInfo && realConnectionInfo.ip){
      hint.innerHTML = '🌐 Alamat ini terdeteksi sebagai IP publik. Pastikan port sudah terbuka (port forwarding/firewall) supaya pemain dari internet bisa connect.';
    } else {
      hint.textContent = '';
    }
  }
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
      <p>Dengan mendaftar dan menggunakan layanan BlockHost, Anda setuju untuk mematuhi syarat & ketentuan ini serta semua kebijakan yang berlaku.</p>
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

/* ============ PANEL KONTROL (TERHUBUNG KE BACKEND ASLI) ============ */
let serverState = 'offline'; // offline | starting | online | stopping
let playerInterval; // sudah tidak dipakai (player sim lama diganti data asli), disisakan agar referensi lama tidak error
let consoleSinceId = 0;
let statusPollTimer = null;

function consoleLine(html, delay){
  const c = document.getElementById('console');
  const div = document.createElement('div');
  div.className = 'l';
  div.style.animationDelay = '0s';
  div.innerHTML = html;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

// Versi aman untuk teks mentah dari console server asli (auto-escape, tidak dieksekusi sebagai HTML)
function consoleLineText(text){
  const c = document.getElementById('console');
  const div = document.createElement('div');
  div.className = 'l';
  div.textContent = text;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function setButtons(starting, online, stopping){
  document.getElementById('btnStart').disabled = starting || online || stopping;
  document.getElementById('btnStop').disabled = !online;
  document.getElementById('btnRestart').disabled = !online;
}

function updateBarsReal(cpuPercent, ramMB){
  const cpuBar = document.getElementById('cpuBar');
  const ramBar = document.getElementById('ramBar');
  const tpsBar = document.getElementById('tpsBar');
  const cpuVal = document.getElementById('cpuVal');
  const ramVal = document.getElementById('ramVal');
  const tpsVal = document.getElementById('tpsVal');
  const ramMaxGB = tierSpecs[currentTier].ram;
  const ramGB = ramMB / 1024;

  cpuBar.style.width = Math.min(100, cpuPercent) + '%';
  cpuVal.textContent = cpuPercent + '%';
  ramBar.style.width = Math.min(100, (ramGB / ramMaxGB) * 100) + '%';
  ramVal.textContent = (ramMB < 1024 ? ramMB + ' MB' : ramGB.toFixed(1) + ' GB') + ' / ' + formatRam(ramMaxGB);
  // TPS asli butuh plugin tambahan untuk diukur — tidak direka-reka, hanya indikator online/offline
  tpsBar.style.width = serverState === 'online' ? '100%' : '0%';
  tpsVal.textContent = serverState === 'online' ? '—' : '0.0';
}

async function apiCall(path, method, body){
  try {
    const opts = { method: method || 'GET' };
    if(body !== undefined){
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    return await res.json();
  } catch(e){
    return { ok:false, error: 'Tidak bisa menghubungi backend. Pastikan "node server.js" sedang berjalan di Termux.' };
  }
}

function stopStatusPolling(){
  if(statusPollTimer){ clearInterval(statusPollTimer); statusPollTimer = null; }
}

function startStatusPolling(){
  stopStatusPolling();
  statusPollTimer = setInterval(pollOnce, 1500);
  pollOnce();
}

async function pollOnce(){
  const status = await apiCall('/api/status');
  if(status.state) applyState(status);

  const consoleData = await apiCall('/api/console?since=' + consoleSinceId);
  if(consoleData.lines){
    consoleData.lines.forEach(l => consoleLineText(l.text));
    consoleSinceId = consoleData.lastId;
  }
  if(status.state === 'offline') stopStatusPolling();
}

function applyState(status){
  const prevState = serverState;
  serverState = status.state;

  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if(serverState === 'online'){
    dot.className = 'status-dot online'; text.textContent = 'ONLINE';
    setButtons(false, true, false);
  } else if(serverState === 'starting'){
    dot.className = 'status-dot starting'; text.textContent = 'MEMULAI...';
    setButtons(true, false, false);
  } else if(serverState === 'stopping'){
    dot.className = 'status-dot starting'; text.textContent = 'BERHENTI...';
    setButtons(false, false, true);
  } else {
    dot.className = 'status-dot'; text.textContent = 'OFFLINE';
    setButtons(false, false, false);
  }

  const slotsLabel = tierSpecs[currentTier].slots === 'Unlimited' ? '∞' : tierSpecs[currentTier].slots;
  document.getElementById('playerCount').textContent = status.playerCount + ' / ' + slotsLabel;
  updateBarsReal(status.cpuPercent || 0, status.ramMB || 0);

  if(prevState !== 'online' && serverState === 'online'){
    showToast('Server berhasil dinyalakan!');
    startAutoBackup();
  }
  if(prevState !== 'offline' && serverState === 'offline'){
    showToast(prevState === 'stopping' ? 'Server dihentikan.' : 'Server berhenti sendiri (cek console).');
    stopAutoBackup();
  }
}

async function serverStart(){
  if(serverState !== 'offline') return;
  document.getElementById('console').innerHTML = '';
  consoleSinceId = 0;
  const r = await apiCall('/api/start', 'POST');
  if(!r.ok){
    consoleLineText('Gagal start: ' + r.error);
    showToast(r.error || 'Gagal menyalakan server');
    return;
  }
  startStatusPolling();
}

async function serverStop(){
  if(serverState !== 'online') return;
  const r = await apiCall('/api/stop', 'POST');
  if(!r.ok){ showToast(r.error || 'Gagal menghentikan server'); return; }
  startStatusPolling();
}

async function serverRestart(){
  if(serverState !== 'online') return;
  showToast('Merestart server...');
  const r = await apiCall('/api/restart', 'POST');
  if(!r.ok){ showToast(r.error || 'Gagal restart'); return; }
  startStatusPolling();
}

// Sinkronkan tampilan dengan kondisi asli backend begitu halaman dibuka/direfresh
window.addEventListener('DOMContentLoaded', () => { startStatusPolling(); });

/* ============ BACKUP DUNIA (semua paket, auto-backup selama online) ============ */
let backups = []; // diisi dari GET /api/backups — arsip tar.gz sungguhan, bukan simulasi
let autoBackupInterval = null;

function formatBytes(n){
  if(n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(1) + ' MB';
}

async function refreshBackups(){
  const r = await apiCall('/api/backups');
  if(r.ok && Array.isArray(r.backups)) backups = r.backups;
  renderBackups();
}

function renderBackups(){
  const list = document.getElementById('backupList');
  list.innerHTML = '';
  if(backups.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada backup. Buat backup pertama Anda di atas.</div>';
    return;
  }
  backups.forEach((b)=>{
    const timeLabel = new Date(b.time).toLocaleDateString('id-ID',{day:'2-digit',month:'short'}) + ', ' + new Date(b.time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">💾 Backup — ${timeLabel}</div>
        <div class="item-meta">${formatBytes(b.sizeBytes)} · ${b.auto ? 'Otomatis' : 'Manual'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn active-btn" onclick="restoreBackup('${b.id}')">PULIHKAN</button>
        <button class="mini-btn danger-btn" onclick="removeBackup('${b.id}')">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

async function manualBackup(){
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
  bar.style.width = '30%';
  pctEl2.textContent = '30%';

  const r = await apiCall('/api/backups', 'POST');

  bar.style.width = '100%';
  pctEl2.textContent = '100%';
  setTimeout(()=>{
    wrap.classList.remove('show');
    btn.disabled = false;
    if(!r.ok){
      showToast(r.error || 'Gagal membuat backup.');
      return;
    }
    refreshBackups();
    showToast('Backup manual asli berhasil dibuat (' + formatBytes(r.backup.sizeBytes) + ').');
  }, 350);
}

async function restoreBackup(id){
  const b = backups.find(x => x.id === id);
  if(!b) return;
  const timeLabel = new Date(b.time).toLocaleDateString('id-ID',{day:'2-digit',month:'short'}) + ', ' + new Date(b.time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  showToast(`Memulihkan dunia dari backup ${timeLabel}...`);
  const r = await apiCall(`/api/backups/${id}/restore`, 'POST');
  if(!r.ok){
    showToast(r.error || 'Gagal memulihkan backup.');
    return;
  }
  showToast('Dunia berhasil dipulihkan dari backup asli.');
  if(serverState === 'online'){
    consoleLine(`Dunia dipulihkan dari <span class="tag2">backup ${timeLabel}</span>.`);
  }
}

async function removeBackup(id){
  const r = await apiCall(`/api/backups/${id}`, 'DELETE');
  if(!r.ok){ showToast(r.error || 'Gagal menghapus backup.'); return; }
  refreshBackups();
  showToast('Backup dihapus.');
}

function startAutoBackup(){
  stopAutoBackup();
  const spec = tierSpecs[currentTier];
  if(!spec.backupIntervalMs) return; // paket Free: manual saja
  autoBackupInterval = setInterval(async ()=>{
    if(serverState !== 'online'){ stopAutoBackup(); return; }
    const r = await apiCall('/api/backups', 'POST');
    if(r.ok){
      refreshBackups();
      consoleLine('💾 Backup otomatis dunia tersimpan (tar.gz asli).');
    }
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

refreshBackups();

/* ============ PLUGIN SERVER (semua paket) ============ */
let plugins = []; // diisi dari GET /api/plugins — file .phar/.jar/.zip asli di folder pocketmine/plugins

async function refreshPlugins(){
  const r = await apiCall('/api/plugins');
  if(r.ok && Array.isArray(r.plugins)) plugins = r.plugins;
  renderPlugins();
}

function renderPlugins(){
  const list = document.getElementById('pluginList');
  list.innerHTML = '';
  if(plugins.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada plugin. Upload file .phar/.jar/.zip lewat tombol di atas.</div>';
    return;
  }
  plugins.forEach((p)=>{
    const row = document.createElement('div');
    row.className = 'item-row' + (p.active ? '' : ' inactive');
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">🧩 ${p.name}</div>
        <div class="item-meta">${p.active ? '<span class="badge-active">AKTIF</span>' : 'nonaktif'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn ${p.active ? '' : 'active-btn'}" onclick="togglePlugin('${p.name}')">${p.active ? 'NONAKTIFKAN' : 'AKTIFKAN'}</button>
        <button class="mini-btn danger-btn" onclick="removePlugin('${p.name}')">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

async function togglePlugin(name){
  const r = await apiCall('/api/plugins/toggle', 'POST', { name });
  if(!r.ok){ showToast(r.error || 'Gagal mengubah status plugin.'); return; }
  await refreshPlugins();
  showToast(r.active
    ? `${name} diaktifkan. Restart server supaya plugin dimuat.`
    : `${name} dinonaktifkan. Restart server supaya perubahan berlaku.`);
}

async function removePlugin(name){
  if(!confirm(`Hapus plugin "${name}" secara permanen?`)) return;
  const r = await apiCall('/api/plugins/delete', 'POST', { name });
  if(!r.ok){ showToast(r.error || 'Gagal menghapus plugin.'); return; }
  await refreshPlugins();
  showToast(`${name} dihapus.`);
}

function addManualPlugin(){
  document.getElementById('pluginFileInput').click();
}

async function handlePluginFileSelected(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(!/\.(phar|jar|zip)$/i.test(file.name)){
    showToast('Nama file plugin harus berakhiran .phar, .jar, atau .zip');
    input.value = '';
    return;
  }
  if(file.size > 50 * 1024 * 1024){
    showToast('Ukuran file melebihi batas 50 MB.');
    input.value = '';
    return;
  }
  showToast(`Mengunggah ${file.name}...`);
  const dataBase64 = await new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  }).catch(()=>null);
  input.value = '';
  if(!dataBase64){ showToast('Gagal membaca file plugin.'); return; }

  const r = await apiCall('/api/plugins/upload', 'POST', { name: file.name, dataBase64 });
  if(!r.ok){ showToast(r.error || 'Gagal mengunggah plugin.'); return; }
  await refreshPlugins();
  showToast(`${file.name} berhasil diunggah. Restart server supaya plugin dimuat.`);
}

refreshPlugins();

/* ============ ADD-ON & MAP MANAGER (ASLI — bukan simulasi) ============ */
// addons/maps diisi dari GET /api/addons dan GET /api/worlds — file
// .mcpack/.mcaddon/.mcworld sungguhan di folder pocketmine/resource_packs,
// behavior_packs, dan worlds. Upload beneran dibongkar (unzip) di server,
// aktif/nonaktif & dunia aktif ditulis ke config PocketMine-MP asli.
let addons = [];
let maps = [];

async function refreshAddons(){
  const r = await apiCall('/api/addons');
  if(r.ok && Array.isArray(r.addons)) addons = r.addons;
  renderAddons();
}

async function refreshMaps(){
  const r = await apiCall('/api/worlds');
  if(r.ok && Array.isArray(r.worlds)) maps = r.worlds;
  renderMaps();
}

function renderAddons(){
  const list = document.getElementById('addonList');
  list.innerHTML = '';
  if(addons.length === 0){
    list.innerHTML = '<div class="empty-hint">Belum ada add-on. Upload dulu di atas.</div>';
    return;
  }
  addons.forEach((item)=>{
    const row = document.createElement('div');
    row.className = 'item-row' + (item.active ? '' : ' inactive');
    const typeLabel = item.type === 'behavior' ? 'behavior pack' : 'resource pack';
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.sizeLabel} · ${typeLabel} ${item.active ? '· <span class="badge-active">AKTIF</span>' : '· nonaktif'}</div>
      </div>
      <div class="item-actions">
        <button class="mini-btn ${item.active ? '' : 'active-btn'}" onclick="toggleAddon('${item.name}','${item.type}')">${item.active ? 'NONAKTIFKAN' : 'AKTIFKAN'}</button>
        <button class="mini-btn danger-btn" onclick="removeAddon('${item.name}','${item.type}')">HAPUS</button>
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
  maps.forEach((item)=>{
    const row = document.createElement('div');
    row.className = 'item-row map-row' + (item.active ? '' : ' inactive');
    row.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">${item.sizeLabel} ${item.active ? '· <span class="badge-active">DUNIA AKTIF</span>' : '· cadangan'}</div>
      </div>
      <div class="item-actions">
        ${item.active ? '' : `<button class="mini-btn active-btn" onclick="setActiveMap('${item.name}')">JADIKAN AKTIF</button>`}
        <button class="mini-btn danger-btn" onclick="removeMap('${item.name}')">HAPUS</button>
      </div>`;
    list.appendChild(row);
  });
}

function openGoogleDrive(type){
  window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener');
  showToast(type === 'addon'
    ? 'Google Drive dibuka di tab baru. Unduh file add-on-nya ke HP, lalu upload lewat tombol di atas.'
    : 'Google Drive dibuka di tab baru. Unduh file map-nya ke HP, lalu upload lewat tombol di atas.');
}

function addManualAddon(){
  showToast('Add-on hanya bisa ditambahkan lewat upload file .mcpack/.mcaddon asli (tombol UPLOAD di atas), supaya isinya benar-benar terpasang di server.');
}

function addManualMap(){
  showToast('Map hanya bisa ditambahkan lewat upload file .mcworld asli (tombol UPLOAD di atas), supaya dunia sungguhan tersimpan di server.');
}

async function toggleAddon(name, type){
  const r = await apiCall('/api/addons/toggle', 'POST', { name, type });
  if(!r.ok){ showToast(r.error || 'Gagal mengubah status add-on.'); return; }
  await refreshAddons();
  showToast(r.active ? `${name} diaktifkan. Restart server supaya diterapkan.` : `${name} dinonaktifkan. Restart server supaya diterapkan.`);
}
async function removeAddon(name, type){
  if(!confirm(`Hapus add-on "${name}" secara permanen?`)) return;
  const r = await apiCall('/api/addons/delete', 'POST', { name, type });
  if(!r.ok){ showToast(r.error || 'Gagal menghapus add-on.'); return; }
  await refreshAddons();
  showToast(`${name} dihapus.`);
}
async function setActiveMap(name){
  const r = await apiCall('/api/worlds/activate', 'POST', { name });
  if(!r.ok){ showToast(r.error || 'Gagal mengaktifkan map.'); return; }
  await refreshMaps();
  showToast(`${name} dijadikan dunia aktif.` + (r.requiresRestart ? ' Restart server untuk menerapkan.' : ''));
}
async function removeMap(name){
  if(!confirm(`Hapus map "${name}" secara permanen?`)) return;
  const r = await apiCall('/api/worlds/delete', 'POST', { name });
  if(!r.ok){ showToast(r.error || 'Gagal menghapus map.'); return; }
  await refreshMaps();
  showToast(`${name} dihapus.`);
}

function readFileAsBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

async function handleUpload(type, inputEl){
  const file = inputEl.files[0];
  if(!file) return;

  const isAddon = type === 'addon';
  const extRe = isAddon ? /\.(mcpack|mcaddon|zip)$/i : /\.(mcworld|zip)$/i;
  const maxMB = isAddon ? 150 : 400;
  if(!extRe.test(file.name)){
    showToast(isAddon ? 'Nama file harus berakhiran .mcpack, .mcaddon, atau .zip' : 'Nama file harus berakhiran .mcworld atau .zip');
    inputEl.value = '';
    return;
  }
  if(file.size > maxMB * 1024 * 1024){
    showToast(`Ukuran file melebihi batas ${maxMB} MB.`);
    inputEl.value = '';
    return;
  }

  const wrap = document.getElementById(type + 'ProgressWrap');
  const nameEl = document.getElementById(type + 'FileName');
  const bar = document.getElementById(type + 'ProgressBar');
  wrap.classList.add('show');
  nameEl.textContent = 'Mengunggah ' + file.name + '...';
  bar.style.width = '30%';

  let dataBase64;
  try {
    dataBase64 = await readFileAsBase64(file);
  } catch (e) {
    wrap.classList.remove('show');
    inputEl.value = '';
    showToast('Gagal membaca file.');
    return;
  }
  bar.style.width = '70%';
  nameEl.textContent = 'Memasang ' + file.name + ' di server...';

  const r = isAddon
    ? await apiCall('/api/addons/upload', 'POST', { name: file.name, dataBase64 })
    : await apiCall('/api/worlds/upload', 'POST', { name: file.name, dataBase64 });

  bar.style.width = '100%';
  inputEl.value = '';
  setTimeout(()=>{ wrap.classList.remove('show'); }, 400);

  if(!r.ok){
    showToast(r.error || (isAddon ? 'Gagal mengunggah add-on.' : 'Gagal mengunggah map.'));
    return;
  }

  if(isAddon){
    await refreshAddons();
    showToast(`Add-on "${file.name}" berhasil dipasang & diaktifkan. Restart server supaya dimuat.`);
  } else {
    await refreshMaps();
    showToast(`Map "${file.name}" berhasil diupload. Tekan "JADIKAN AKTIF" untuk memakainya sebagai dunia server.`);
  }
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

refreshAddons();
refreshMaps();

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
    content: '[FILE BINER — EssentialsPMMP.phar]\n\nPlugin siap pakai untuk PocketMine-MP/Nukkit (perintah dasar, teleport, economy, dll).\nUpload plugin baru dengan drag & drop file .phar (PocketMine-MP) atau .jar (Nukkit) ke folder ini — hanya aktif jika Software Server bukan "Bedrock Dedicated Server (Vanilla)", karena versi vanilla resmi Mojang tidak mendukung plugin pihak ketiga.',
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

/* ============ DATABASE PEMAIN (data asli dari file server, bukan contoh) ============ */
let playerDatabase = [];

function formatLastSeen(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

async function loadPlayerDatabase(){
  const tbody = document.getElementById('dbPlayerTable');
  if(!tbody) return;
  try{
    const resp = await fetch('/api/players');
    const data = await resp.json();
    playerDatabase = data.ok ? data.players : [];
  }catch(e){
    playerDatabase = [];
  }
  renderPlayerDatabase();
}

function renderPlayerDatabase(){
  const tbody = document.getElementById('dbPlayerTable');
  if(!tbody) return;
  tbody.innerHTML = '';

  if(playerDatabase.length === 0){
    tbody.innerHTML = `<tr><td colspan="8" style="opacity:.6;text-align:center;padding:16px;">Belum ada data pemain. Data akan muncul otomatis setelah ada pemain yang pernah masuk ke server ini.</td></tr>`;
    return;
  }

  const serverOnline = serverState === 'online';
  playerDatabase.forEach((p, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}${p.online ? ' <span class="db-status-ok">● ONLINE</span>' : ''}</td>
      <td>${p.op ? 'Operator' : (p.whitelisted ? 'Whitelist' : 'Anggota')}</td>
      <td class="db-vip-cell">
        ${renderVipBadge(p.vipTier, p.vipLabel, p.vipColor)}
        <select class="vip-select" onchange="setPlayerVip(${i}, this.value)" title="Atur tier VIP pemain ini">
          <option value="0" ${!p.vipTier ? 'selected' : ''}>Tidak ada VIP</option>
          <option value="1" ${p.vipTier === 1 ? 'selected' : ''}>VIP I</option>
          <option value="2" ${p.vipTier === 2 ? 'selected' : ''}>VIP II</option>
          <option value="3" ${p.vipTier === 3 ? 'selected' : ''}>VIP III</option>
        </select>
        ${p.vipTier ? `<button class="mini-btn" onclick="resendVipPerks(${i})" ${serverOnline ? '' : 'disabled'} title="${serverOnline ? 'Kirim ulang privilege VIP' : 'Server harus online'}">KIRIM ULANG</button>` : ''}
      </td>
      <td>
        <select onchange="changePlayerMode(${i}, this.value)" ${serverOnline ? '' : 'disabled'} title="${serverOnline ? '' : 'Server harus online untuk ganti mode'}">
          <option value="survival">Survival</option>
          <option value="creative">Creative</option>
          <option value="adventure">Adventure</option>
        </select>
      </td>
      <td>${p.playtimeLabel || '0j 0m'}</td>
      <td>${formatLastSeen(p.lastSeen)}</td>
      <td class="${p.banned ? 'db-status-banned' : 'db-status-ok'}">${p.banned ? 'DIBANNED' : 'AKTIF'}</td>
      <td class="db-actions">
        <button class="mini-btn danger-btn" onclick="kickPlayer(${i})" ${p.online ? '' : 'disabled'} title="${p.online ? '' : 'Pemain sedang tidak online'}">KICK</button>
        <button class="mini-btn ${p.banned ? 'active-btn' : 'danger-btn'}" onclick="toggleBanPlayer(${i})" ${serverOnline ? '' : 'disabled'}>${p.banned ? 'UNBAN' : 'BAN'}</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderVipBadge(tier, label, color){
  if(!tier) return '<span style="color:var(--text-dimmer);font-size:11px;">—</span>';
  return `<span class="vip-badge" style="--vip-color:${color || 'var(--gold)'}">★ ${label}</span>`;
}

/* ============ VIP PEMAIN (tier 1-3, privilege dikirim ke server asli) ============ */
let vipTiers = [];

async function loadVipTiers(){
  const grid = document.getElementById('vipTierGrid');
  if(!grid) return;
  try{
    const resp = await fetch('/api/vip/tiers');
    const data = await resp.json();
    vipTiers = data.ok ? data.tiers : [];
  }catch(e){
    vipTiers = [];
  }
  grid.innerHTML = vipTiers.map(t => `
    <div class="vip-card" style="--vip-color:${t.color}">
      <div class="vip-card-top">
        <div class="vip-card-icon">★</div>
        <div>
          <div class="vip-card-name">${t.label} — ${t.name}</div>
          <div class="vip-card-sub">Privilege otomatis saat pemain login</div>
        </div>
      </div>
      <ul>${t.privileges.map(pr => `<li>${pr}</li>`).join('')}</ul>
    </div>
  `).join('');
}
loadVipTiers();

async function setPlayerVip(i, tierValue){
  const p = playerDatabase[i];
  const tier = parseInt(tierValue, 10);
  try{
    const resp = await fetch('/api/vip/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, tier }),
    });
    const data = await resp.json();
    if(!data.ok){ showToast(data.error || 'Gagal mengatur VIP.'); renderPlayerDatabase(); return; }
    if(tier === 0){
      showToast(`Status VIP ${p.name} dicabut.`);
    }else{
      showToast(data.perksApplied
        ? `${p.name} sekarang ${vipTiers.find(t=>t.id===tier)?.label || 'VIP'}! Privilege sudah dikirim ke server.`
        : `${p.name} diatur jadi VIP tier ${tier}. ${data.perksNote || 'Privilege akan dikirim otomatis saat pemain login.'}`);
    }
    loadPlayerDatabase();
  }catch(e){
    showToast('Tidak bisa menghubungi server.');
    renderPlayerDatabase();
  }
}

async function resendVipPerks(i){
  const p = playerDatabase[i];
  try{
    const resp = await fetch('/api/vip/reapply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name }),
    });
    const data = await resp.json();
    showToast(data.ok ? `Privilege VIP ${p.name} dikirim ulang.` : (data.error || 'Gagal mengirim privilege.'));
  }catch(e){
    showToast('Tidak bisa menghubungi server.');
  }
}

async function sendConsoleCommand(cmd){
  try{
    const resp = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    });
    return await resp.json();
  }catch(e){
    return { ok: false, error: 'Tidak bisa menghubungi server.' };
  }
}

async function changePlayerMode(i, mode){
  const p = playerDatabase[i];
  if(serverState !== 'online'){ showToast('Server harus ONLINE dulu untuk mengganti mode pemain.'); renderPlayerDatabase(); return; }
  const r = await sendConsoleCommand(`gamemode ${mode} ${p.name}`);
  showToast(r.ok ? `Perintah dikirim: ganti mode ${p.name} ke ${mode}.` : (r.error || 'Gagal mengirim perintah.'));
}
async function kickPlayer(i){
  const p = playerDatabase[i];
  const r = await sendConsoleCommand(`kick ${p.name}`);
  showToast(r.ok ? `${p.name} dikeluarkan dari server.` : (r.error || 'Gagal mengirim perintah.'));
  setTimeout(loadPlayerDatabase, 1000);
}
async function toggleBanPlayer(i){
  const p = playerDatabase[i];
  if(serverState !== 'online'){ showToast('Server harus ONLINE dulu untuk ban/unban pemain.'); return; }
  const r = await sendConsoleCommand(`${p.banned ? 'unban' : 'ban'} ${p.name}`);
  showToast(r.ok ? `${p.name} ${p.banned ? 'di-unban' : 'diban'}.` : (r.error || 'Gagal mengirim perintah.'));
  setTimeout(loadPlayerDatabase, 1000);
}

loadPlayerDatabase();
setInterval(loadPlayerDatabase, 10000); // refresh data pemain tiap 10 detik


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

      showToast(`Berhasil menambang katalog "${item.name}" (tier ${t.label})! Ini cuma daftar preview — upload file .${type === 'addon' ? 'mcpack/.mcaddon' : 'mcworld'} aslinya sendiri di menu ${type === 'addon' ? 'ADD-ON' : 'MAP'} di atas supaya benar-benar terpasang di server (BlockHost tidak menyediakan file berhak cipta pihak lain).`);
    }
  }, 120);
}

// Catatan: jumlah pemain (playerCount) diambil langsung dari status.playerCount
// yang dikirim backend (server.js) — data ASLI hasil parsing log PocketMine-MP,
// bukan simulasi.