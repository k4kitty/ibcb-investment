const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ibcb.db');
const USERNAME = 'admin';
const PASSWORD = 'IBCB123!';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) { console.error('DB Error:', err.message); process.exit(1); }
});

const hashed = bcrypt.hashSync(PASSWORD, 10);

db.run('INSERT OR REPLACE INTO admins (id, username, password) VALUES (?, ?, ?)', ['admin_' + Date.now(), USERNAME, hashed], function(err) {
    if (err) {
        console.error('Insert Error:', err.message);
        process.exit(1);
    }
    console.log('Admin account ready:', USERNAME);
    db.close(() => process.exit(0));
});
