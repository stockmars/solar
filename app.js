// GANTI URL INI DENGAN URL WEB APP APPS SCRIPT ANDA (yang berakhiran /exec)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwhXY5OzHB3N_z0HE0yZaqQVfpdHgsIOIIp_G6P3A2OmCZ001WSsQplmiIGsUuYQzY_Yg/exec';

let currentUser = null;

// Fungsi pembantu untuk memanggil API Apps Script
// Fungsi pembantu untuk memanggil API Apps Script via JSONP (Menembus CORS)
function callAPI(action, params = {}) {
  return new Promise((resolve) => {
    // Buat nama fungsi unik untuk callback
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    
    // Daftarkan fungsi callback ke window global
    window[callbackName] = function(data) {
      delete window[callbackName]; // Hapus setelah dipakai
      document.body.removeChild(script);
      resolve(data);
    };

    // Siapkan parameter
    const queryString = new URLSearchParams({ action, callback: callbackName, ...params }).toString();
    
    // Buat tag script untuk menembak API
    const script = document.createElement('script');
    script.src = `${GAS_URL}?${queryString}`;
    
    // Penanganan error jika gagal muat
    script.onerror = function() {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve({ status: 'error', message: 'Gagal memuat script API. Periksa URL GAS_URL.' });
    };

    document.body.appendChild(script);
  });
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
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('d-none'));
  document.getElementById('tab-' + tabName).classList.remove('d-none');
  
  let title = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  if(tabName === 'legalitas') title = 'Legalitas Vendor';
  document.getElementById('page-title').innerText = title;

  document.querySelectorAll('.sidebar .nav-link').forEach(el => {
    el.classList.remove('active');
    el.classList.add('text-white');
  });
  element.classList.add('active');
  element.classList.remove('text-white');

  // TAMBAHKAN INI: Load data sesuai tab yang dibuka
  if (tabName === 'vendor') {
    loadVendors();
  }
}

function logout() {
  localStorage.removeItem('user_email');
  location.reload();
}
// ==========================================
// MODUL VENDOR
// ==========================================

// Panggil ini setiap kali tab vendor dibuka
async function loadVendors() {
  const tbody = document.getElementById('tabel-vendor-body');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center">Memuat data...</td></tr>';
  
  const res = await callAPI('getVendors');
  if (res.status === 'success') {
    tbody.innerHTML = '';
    if (res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada data vendor.</td></tr>';
      return;
    }
    
    res.data.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${v.NamaVendor}</td>
        <td>${v.NamaPerusahaan}</td>
        <td>${v.NamaPIC || '-'}</td>
        <td><span class="badge ${v.StatusVendor === 'Aktif' ? 'bg-success' : 'bg-danger'}">${v.StatusVendor}</span></td>
        <td>
          <button class="btn btn-sm btn-warning" onclick='editVendor(${JSON.stringify(v).replace(/'/g, "&#39;")})'>Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${res.message}</td></tr>`;
  }
}

async function simpanVendor(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-vendor');
  btn.innerText = 'Menyimpan...';
  btn.disabled = true;

  const data = {
    VendorID: document.getElementById('vendor-id').value,
    NamaVendor: document.getElementById('vendor-nama').value,
    NamaPerusahaan: document.getElementById('vendor-perusahaan').value,
    NPWP: document.getElementById('vendor-npwp').value,
    NamaPIC: document.getElementById('vendor-pic').value,
    Alamat: document.getElementById('vendor-alamat').value,
    StatusVendor: 'Aktif'
  };

  const res = await callAPI('saveVendor', { vendorData: JSON.stringify(data) });
  
  btn.innerText = 'Simpan Vendor';
  btn.disabled = false;

  if (res.status === 'success') {
    alert(res.message);
    resetFormVendor();
    loadVendors(); // Refresh tabel
  } else {
    alert('Gagal: ' + res.message);
  }
}

function editVendor(v) {
  document.getElementById('vendor-id').value = v.VendorID;
  document.getElementById('vendor-nama').value = v.NamaVendor;
  document.getElementById('vendor-perusahaan').value = v.NamaPerusahaan;
  document.getElementById('vendor-npwp').value = v.NPWP || '';
  document.getElementById('vendor-pic').value = v.NamaPIC || '';
  document.getElementById('vendor-alamat').value = v.Alamat || '';
  window.scrollTo(0,0); // Scroll ke atas form
}

function resetFormVendor() {
  document.getElementById('form-vendor').reset();
  document.getElementById('vendor-id').value = '';
}
