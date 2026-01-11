// === LOAD DATA SAAT HALAMAN DIBUKA ===
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAlbums();
    loadKeys();
});

// 1. LOAD STATISTIK
function loadStats() {
    fetch('/api/admin/stats')
        .then(res => res.json())
        .then(data => {
            document.getElementById('totalAlbums').innerText = data.totalAlbums;
            document.getElementById('activeKeys').innerText = data.activeKeys;
        });
}

// 2. LOAD DAFTAR ALBUM
function loadAlbums() {
    fetch('/api/albums?key=admin_bypass') // Kita pakai bypass khusus admin
        .then(res => res.json())
        .then(respon => {
            const list = document.getElementById('albumList');
            let html = '';
            
            respon.data.forEach(item => {
                let harga = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price);
                html += `
                <tr>
                    <td><img src="/img/${item.cover_image}" class="album-thumb" onerror="this.src='https://via.placeholder.com/50'"></td>
                    <td>
                        <div class="fw-bold">${item.title}</div>
                        <div class="text-muted small">${item.artist}</div>
                    </td>
                    <td class="fw-bold text-secondary">${harga}</td>
                    <td>
                        <button onclick="deleteAlbum(${item.id})" class="btn-delete" title="Hapus Album">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                </tr>`;
            });
            list.innerHTML = html;
        });
}

// 3. LOAD DAFTAR KEY USER
function loadKeys() {
    fetch('/api/admin/keys')
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('keyList');
            let html = '';

            data.forEach(user => {
                let statusBadge = user.status === 'active' 
                    ? `<span class="badge-status bg-active">Active</span>` 
                    : `<span class="badge-status bg-blocked">Blocked</span>`;
                
                let btnColor = user.status === 'active' ? 'text-danger' : 'text-success';
                let btnIcon = user.status === 'active' ? 'bi-slash-circle' : 'bi-check-circle-fill';

                html += `
                <div class="key-item">
                    <div>
                        <div class="fw-bold text-dark">${user.name}</div>
                        <span class="key-code">${user.key_code}</span>
                        <div class="mt-1">${statusBadge}</div>
                    </div>
                    <button onclick="toggleKey(${user.id}, '${user.status}')" class="btn btn-sm btn-light border ${btnColor}">
                        <i class="bi ${btnIcon}"></i>
                    </button>
                </div>`;
            });
            list.innerHTML = html;
        });
}

// 4. TAMBAH ALBUM BARU
document.getElementById('addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
        title: document.getElementById('addTitle').value,
        artist: document.getElementById('addArtist').value,
        price: document.getElementById('addPrice').value,
        cover_image: document.getElementById('addImage').value
    };

    fetch('/api/admin/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(() => {
        alert("Album berhasil ditambahkan!");
        location.reload(); // Refresh halaman
    });
});

// 5. HAPUS ALBUM
function deleteAlbum(id) {
    if(confirm("Yakin mau hapus album ini?")) {
        fetch(`/api/admin/albums/${id}`, { method: 'DELETE' })
        .then(() => {
            loadAlbums(); // Refresh tabel tanpa reload page
            loadStats();
        });
    }
}

// 6. BLOKIR / UNBLOCK KEY
function toggleKey(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    fetch(`/api/admin/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    }).then(() => {
        loadKeys(); // Refresh list key
        loadStats();
    });
}