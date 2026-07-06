const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ibcb.db');
const USERNAME = 'admin';
const NEW_PASSWORD = 'IBCB123!';

console.time ? console.time('reset') : null;

const hashed = bcrypt.hashSync(NEW_PASSWORD, 10);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('DB Error:', err.message);
        process.exit(1);
    }

    const sql = 'UPDATE admins SET password = ? WHERE username = ?';
    db.run(sql, [hashed, USERNAME], function(err) {
        if (err) {
            console.error('Reset Error:', err.message);
            process.exit(1);
        }
        if (this.changes === 0) {
            console.warn('No admin row updated. The username `' + USERNAME + '` might not exist.');
        } else {
            console.log('Admin password has been reset successfully.');
        }
        db.close(() => process.exit(0));
    });
});

process.on('SIGINT', () => { process.exit(0); });
