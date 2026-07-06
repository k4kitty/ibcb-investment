const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ibcb.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) { console.error('DB Error:', err.message); process.exit(1); }
});

db.run('DELETE FROM admins;', (err) => {
    if (err) { console.error('Delete Error:', err.message); process.exit(1); }
    console.log('Deleted admin rows.');
    db.close(() => process.exit(0));
});
