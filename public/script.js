// === 1. LOGIC LOGIN (Hanya jalan di login.html) ===
function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');

    if (!email || !password) {
        errorMsg.innerText = "⚠️ Harap isi email dan password!";
        return;
    }

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            // CEK ROLE DARI BACKEND
            if (data.role === 'admin') {
                window.location.href = '/admin'; // Belok ke Halaman Admin
            } else {
                window.location.href = '/dashboard.html'; // Belok ke Dashboard User
            }
        } else {
            errorMsg.innerText = "❌ " + data.message;
        }
    })
    .catch(err => console.error(err));
}

// === 2. LOGIC DASHBOARD (Jalan otomatis saat dashboard dibuka) ===
if (window.location.pathname.includes('dashboard.html')) {
    loadUserData();
}

function loadUserData() {
    fetch('/api/me')
    .then(res => {
        if (res.status === 401) {
            alert("Sesi habis, silakan login lagi!");
            window.location.href = '/'; 
        }
        return res.json();
    })
    .then(data => {
        // Tampilkan Nama User
        if(document.getElementById('userNameDisplay')) {
            document.getElementById('userNameDisplay').innerText = "Hai, " + data.name + "!";
        }
        
        // Cek Key
        const keyInput = document.getElementById('myKeyInput');
        const testInput = document.getElementById('testKeyInput');
        const btnGen = document.getElementById('btnGenerate');

        if (data.key) {
            if(keyInput) keyInput.value = data.key;
            if(testInput) testInput.value = data.key; 
            
            if(btnGen) {
                btnGen.innerText = "STATUS: AKTIF ✅";
                btnGen.classList.remove('btn-retro');
                btnGen.classList.add('btn', 'btn-success', 'border-2');
                btnGen.disabled = true;
            }
        }
    });
}

// === 3. LOGIC GENERATE KEY ===
function generateKey() {
    if(!confirm("Yakin mau generate key baru?")) return;

    fetch('/api/generate-key', { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            location.reload(); 
        } else {
            alert("Gagal membuat key");
        }
    });
}

// === 4. LOGIC AMBIL DATA (UPDATED) ===
function fetchAlbumData() {
    const key = document.getElementById('testKeyInput').value;
    const resultArea = document.getElementById('resultArea');
    const jsonContent = document.getElementById('jsonContent');
    const loading = document.getElementById('loading');
    
    // Elemen Kotak Hitam Baru
    const requestBox = document.getElementById('requestInfoBox');
    const urlText = document.getElementById('urlDisplayText');

    if (!key) { alert("Key tidak boleh kosong!"); return; }

    // Reset Tampilan
    resultArea.innerHTML = '';
    loading.classList.remove('d-none');
    requestBox.classList.add('d-none'); // Sembunyikan dulu kotak hitam saat loading

    // Construct URL Lengkap
    const fullUrl = `${window.location.protocol}//${window.location.host}/api/albums?key=${key}`;

    fetch('/api/albums?key=' + key)
    .then(res => res.json())
    .then(respon => {
        loading.classList.add('d-none');

        // === MUNCULKAN KOTAK HITAM ===
        requestBox.classList.remove('d-none');
        urlText.innerText = fullUrl;
        // =============================

        // Isi JSON Area
        if(jsonContent) {
            jsonContent.innerText = JSON.stringify(respon, null, 4);
        }

        // Isi Visual Area
        if (respon.status === 'success') {
            let html = '';
            respon.data.forEach(item => {
                let harga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price);
                html += `
                <div class="col-md-4 col-sm-6">
                    <div class="card-produk">
                        <img src="img/${item.cover_image}" class="card-img-top w-100" onerror="this.src='https://via.placeholder.com/300?text=No+Cover'">
                        <div class="p-3">
                            <h5 class="fw-bold text-dark mb-1">${item.title}</h5>
                            <p class="text-secondary small mb-2">${item.artist}</p>
                            <div class="harga">${harga}</div>
                        </div>
                    </div>
                </div>`;
            });
            resultArea.innerHTML = html;
        } else {
            resultArea.innerHTML = `<div class="alert alert-danger w-100 text-center fw-bold">⛔ ${respon.message}</div>`;
        }
    })
    .catch(err => {
        loading.classList.add('d-none');
        alert("Terjadi kesalahan sistem!");
    });
}

// === 5. LOGIC PINDAH TAB (VISUAL <-> JSON) ===
function switchTab(mode) {
    const visualBox = document.getElementById('resultArea');
    const jsonBox = document.getElementById('jsonArea');
    const btnVisual = document.getElementById('btnVisual');
    const btnJson = document.getElementById('btnJson');

    if (mode === 'visual') {
        visualBox.classList.remove('d-none');
        jsonBox.classList.add('d-none');
        
        btnVisual.classList.add('active', 'text-dark', 'border-bottom', 'border-warning');
        btnVisual.classList.remove('text-secondary');
        
        btnJson.classList.remove('active', 'text-dark', 'border-bottom', 'border-warning');
        btnJson.classList.add('text-secondary');
    } else {
        visualBox.classList.add('d-none');
        jsonBox.classList.remove('d-none');

        btnJson.classList.add('active', 'text-dark', 'border-bottom', 'border-warning');
        btnJson.classList.remove('text-secondary');

        btnVisual.classList.remove('active', 'text-dark', 'border-bottom', 'border-warning');
        btnVisual.classList.add('text-secondary');
    }
}