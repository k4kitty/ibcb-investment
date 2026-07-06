const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'ibcb.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('DB Error:', err.message);
        process.exit(1);
    }
    console.log('Database initialized:', DB_PATH);
});

async function init() {
    // Hash default password
    const defaultPassword = bcrypt.hashSync('IBCB123!', 10);

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`, (err) => {
            if (err) { console.error('Error creating admins table:', err); process.exit(1); }

            db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
                if (err) { console.error('Error checking admins:', err); process.exit(1); }

                if (row.count === 0) {
                    const adminId = 'admin_' + Date.now();
                    db.run('INSERT INTO admins (id, username, password) VALUES (?, ?, ?)',
                        [adminId, 'admin', defaultPassword],
                        (err) => {
                            if (err) { console.error('Error inserting admin:', err); process.exit(1); }
                            console.log('\n========================================');
                            console.log('Default admin account created:');
                            console.log('Username: admin');
                            console.log('Password: IBCB123!');
                            console.log('========================================\n');
                            console.log('Please change the default password in production!\n');
                            createDataTables();
                        }
                    );
                } else {
                    console.log('Admin account already exists. Skipping initialization.');
                    createDataTables();
                }
            });
        });
    });
}

function createDataTables() {
    db.run(`CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        org TEXT,
        title TEXT,
        role TEXT,
        phone TEXT,
        wechat TEXT,
        country TEXT NOT NULL,
        city TEXT NOT NULL,
        interest TEXT,
        status TEXT DEFAULT 'active',
        registeredAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
    )`, (err) => {
        if (err) { console.error('Error creating members table:', err); process.exit(1); }
        console.log('Members table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS 活動_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        org TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        wechat TEXT,
        date TEXT NOT NULL,
        slot TEXT NOT NULL,
        interest TEXT,
        agreed INTEGER DEFAULT 1,
        submittedAt TEXT NOT NULL
    )`, (err) => {
        if (err) { console.error('Error creating 活動_submissions table:', err); process.exit(1); }
        console.log('活動 submissions table ready');
    });

    db.run(`CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
    )`, (err) => {
        if (err) { console.error('Error creating news table:', err); process.exit(1); }
        console.log('News table ready');
        setTimeout(() => {
            db.close(() => process.exit(0));
        }, 200);
    });
}

init();
