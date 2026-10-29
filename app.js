// GANTI URL INI DENGAN URL WEB APP APPS SCRIPT ANDA (yang berakhiran /exec)
const GAS_URL = 'URL_WEB_APP_APPS_SCRIPT_ANDA_DISINI';

let currentUser = null;

// Fungsi pembantu untuk memanggil API Apps Script
async function callAPI(action, params = {}) {
  const queryString = new URLSearchParams({ action, ...params }).toString();
  try {
    const response = await fetch(`${GAS_URL}?${queryString}`);
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { status: 'error', message: 'Gagal terhubung ke server backend.' };
  }
}

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Ambil email dari parameter URL (dikirim oleh Google) atau prompt
  // Karena kita tidak menggunakan Apps Script HTML Service lagi, 
  // kita harus tahu siapa yang login. 
  // Untuk sementara di GitHub Pages, kita minta user memasukkan emailnya.
  
  let userEmail = localStorage.getItem('user_email');
  
  if (!userEmail) {
    userEmail = prompt("Masukkan email Google Anda yang terdaftar:");
    if (userEmail) {
      localStorage.setItem('user_email', userEmail);
    } else {
      document.getElementById('loading-screen').innerHTML = '<h4>Akses Ditolak. Email diperlukan.</h4>';
      return;
    }
  }

  // 2. Panggil API untuk verifikasi user
  const res = await callAPI('getCurrentUser', { email: userEmail });

  if (res.status === 'error') {
    document.getElementById('loading-screen').innerHTML = `
      <div class="alert alert-danger m-5">
        <h4>Akses Ditolak</h4>
        <p>${res.message}</p>
        <button class="btn btn-secondary" onclick="localStorage.removeItem('user_email'); location.reload()">Ganti Email</button>
      </div>`;
    return;
  }

  // 3. Jika berhasil, tampilkan aplikasi
  currentUser = res.data;
  document.getElementById('user-info').innerText = `${currentUser.Nama} (${currentUser.Role})`;
  
  document.getElementById('loading-screen').classList.add('d-none');
  document.getElementById('main-app').classList.remove('d-none');

  // 4. Load data dashboard
  const dashRes = await callAPI('getDashboardData');
  if (dashRes.status === 'success') {
    document.getElementById('stat-transaksi').innerText = dashRes.data.totalTransaksi;
    document.getElementById('stat-volume').innerText = dashRes.data.totalVolume;
    document.getElementById('stat-invoice').innerText = 'Rp ' + dashRes.data.totalInvoice.toLocaleString('id-ID');
  }
});

// Fungsi navigasi tab
function switchTab(tabName, element) {
  // Sembunyikan semua tab
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('d-none'));
  // Tampilkan tab terpilih
  document.getElementById('tab-' + tabName).classList.remove('d-none');
  
  // Update judul
  let title = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  if(tabName === 'legalitas') title = 'Legalitas Vendor';
  document.getElementById('page-title').innerText = title;

  // Update sidebar active state
  document.querySelectorAll('.sidebar .nav-link').forEach(el => {
    el.classList.remove('active');
    el.classList.add('text-white');
  });
  element.classList.add('active');
  element.classList.remove('text-white');
}

function logout() {
  localStorage.removeItem('user_email');
  location.reload();
}
