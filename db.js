const mysql = require('mysql2');

const db = mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: '',       // Kosongkan jika pakai XAMPP default
    database: 'album_toko'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Gagal Konek Database:', err);
    } else {
        console.log('✅ Database Terhubung!');
    }
});

module.exports = db;