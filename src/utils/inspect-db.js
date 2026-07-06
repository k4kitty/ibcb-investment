const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'ibcb.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) { console.error('DB Error:', err.message); process.exit(1); }
});

const tables = new Set();
const seen = new Set();

db.serialize(() => {
    db.each("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) return console.error(err);
        if (row && row.name) tables.add(row.name);
    });
    db.on('end', () => {});

    const inspect = (sql) => new Promise((resolve) => {
        const rows=[];
        db.each(sql, (err, row) => {
            if (err) { console.error('query error', err); resolve(rows); return; }
            if (row) rows.push(row);
        }, (err) => { if (err) console.error(err); resolve(rows); });
    });

    (async () => {
        const allTables = [...tables];
        console.log('TABLES:', allTables.join(', ') || '(none found before callback)');
        const t = inspect("SELECT name FROM sqlite_master WHERE type='table'").then(rows => {
            console.log('TABLES_LATE:', rows.map(r => r.name).join(', ') || '(none)');
        });
        const a1 = inspect('SELECT * FROM admins LIMIT 5').then(rows => {
            console.log('ADMINS_EXIST:', rows.length);
            if (rows.length) {
                rows.forEach(r => {
                    const redacted = { ...r, password: r.password ? r.password.slice(0,6)+'...' + r.password.length : null };
                    console.log('ADMIN_ROW:', redacted);
                });
            }
        });
        const a2 = inspect('PRAGMA table_info(admins)').then(rows => {
            console.log('ADMINS_SCHEMA:', rows.map(r => r.name).join(', ') || '(none)');
        });
        await Promise.all([t,a1,a2]);
        db.close(() => process.exit(0));
    })();
});
