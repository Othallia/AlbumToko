const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// === MIDDLEWARE ===
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'rahasia_negara_api',
    resave: false,
    saveUninitialized: true
}));


// 1. Halaman Login (Root)
app.get('/', (req, res) => {
    if (req.session.loggedIn) {
        if (req.session.role === 'admin') return res.redirect('/admin');
        return res.redirect('/dashboard.html');
    }
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// 2. Halaman Register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/register.html'));
});

// 3. Halaman Admin
app.get('/admin', (req, res) => {
    // Cek apakah login & apakah role-nya admin
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});


// A. PROSES LOGIN (SATU PINTU UNTUK ADMIN & USER)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // 1. CEK HARDCODE ADMIN
    if(email === 'admin@toko.com' && password === 'admin123') {
        req.session.loggedIn = true;
        req.session.userId = 999;
        req.session.role = 'admin'; // Set Role Admin
        req.session.userName = "Boss Admin";
        
        // Kirim sinyal ke frontend
        return res.json({ status: 'success', role: 'admin' });
    }

    // 2. CEK DATABASE USER BIASA
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).json({ status: 'error', message: 'Database Error' });
        
        if (results.length > 0) {
            const user = results[0];
            if (password === user.password) {
                req.session.loggedIn = true;
                req.session.userId = user.id;
                req.session.role = 'user'; // Set Role User
                req.session.userName = user.name;
                
                // Kirim sinyal ke frontend
                return res.json({ status: 'success', role: 'user' });
            }
        }
        res.json({ status: 'error', message: 'Email atau Password Salah!' });
    });
});

// B. Proses Register
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (results.length > 0) return res.json({ status: 'error', message: 'Email sudah terdaftar!' });

        const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        db.query(sql, [name, email, password], (err) => {
            if (err) return res.json({ status: 'error', message: 'Gagal Database' });
            res.json({ status: 'success' });
        });
    });
});

// C. Ambil Data User (Dashboard Info)
app.get('/api/me', (req, res) => {
    if (!req.session.loggedIn) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    db.query("SELECT key_code FROM api_keys WHERE user_id = ?", [req.session.userId], (err, results) => {
        const myKey = results.length > 0 ? results[0].key_code : null;
        res.json({
            status: 'success',
            name: req.session.userName,
            key: myKey
        });
    });
});

// D. Generate API Key Baru
app.post('/api/generate-key', (req, res) => {
    if (!req.session.loggedIn) return res.status(401).json({ status: 'error' });

    const randomStr = Math.random().toString(36).substring(2, 10);
    const newKey = "sk-music-" + randomStr;

    db.query("INSERT INTO api_keys (user_id, key_code) VALUES (?, ?)", [req.session.userId, newKey], (err) => {
        if (err) return res.json({ status: 'error', message: 'Gagal buat key' });
        res.json({ status: 'success', newKey: newKey });
    });
});


app.get('/api/albums', (req, res) => {
    const apiKey = req.query.key;

    // 1. BYPASS ADMIN (Supaya Admin Dashboard bisa load data tanpa key)
    if (apiKey === 'admin_bypass') {
        // Cek sesi biar gak sembarang orang tembak api ini
        if (req.session.role === 'admin') {
            db.query("SELECT * FROM albums ORDER BY id DESC", (err, albums) => {
                return res.json({ status: 'success', data: albums });
            });
            return; 
        }
    }

    // 2. Cek Validasi Key (User Biasa)
    db.query("SELECT * FROM api_keys WHERE key_code = ? AND status = 'active'", [apiKey], (err, keyResult) => {
        if (keyResult.length > 0) {
            db.query("SELECT * FROM albums", (err, albums) => {
                res.json({ status: 'success', data: albums });
            });
        } else {
            res.status(403).json({ status: 'error', message: 'API Key Tidak Valid / Diblokir' });
        }
    });
});


// Middleware Cek Admin Sederhana
const checkAdmin = (req, res, next) => {
    if (req.session.loggedIn && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).json({ status: 'error', message: 'Akses Ditolak: Bukan Admin' });
    }
};

// 1. Statistik
app.get('/api/admin/stats', checkAdmin, (req, res) => {
    db.query("SELECT COUNT(*) as total FROM albums", (err, res1) => {
        db.query("SELECT COUNT(*) as total FROM api_keys WHERE status='active'", (err, res2) => {
            res.json({
                totalAlbums: res1[0].total,
                activeKeys: res2[0].total
            });
        });
    });
});

// 2. List Key User
app.get('/api/admin/keys', checkAdmin, (req, res) => {
    const sql = `
        SELECT users.name, api_keys.id, api_keys.key_code, api_keys.status 
        FROM api_keys 
        JOIN users ON api_keys.user_id = users.id
        ORDER BY api_keys.id DESC
    `;
    db.query(sql, (err, results) => {
        res.json(results);
    });
});

// 3. Tambah Album
app.post('/api/admin/albums', checkAdmin, (req, res) => {
    const { title, artist, price, cover_image } = req.body;
    const sql = "INSERT INTO albums (title, artist, price, cover_image) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, artist, price, cover_image], (err) => {
        if(err) console.log(err);
        res.json({ status: 'success' });
    });
});

// 4. Hapus Album
app.delete('/api/admin/albums/:id', checkAdmin, (req, res) => {
    db.query("DELETE FROM albums WHERE id = ?", [req.params.id], () => {
        res.json({ status: 'success' });
    });
});

// 5. Blokir Key
app.put('/api/admin/keys/:id', checkAdmin, (req, res) => {
    const { status } = req.body;
    db.query("UPDATE api_keys SET status = ? WHERE id = ?", [status, req.params.id], () => {
        res.json({ status: 'success' });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});