/**
 * Database Adapter — SQLite (dev) / PostgreSQL (production)
 * Unified API: dbGet, dbAll, dbRun — same as current server.js
 */

const isPG = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

let dbGet, dbAll, dbRun, dbClose;
let pool = null;
let schema = [];

if (isPG) {
    const { Pool } = require('pg');
    pool = new Pool({ 
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
        query_timeout: 8000,
    });
    
    // Fail-fast connection test on startup
    pool.query('SELECT 1')
        .then(() => console.log('✅ PostgreSQL connected'))
        .catch(e => console.error('❌ PostgreSQL connection failed:', e.message));

    // PostgreSQL parameter placeholders: $1, $2, ... (not ?)
    function pgSql(sql, params = []) {
        let idx = 0;
        return { text: sql.replace(/\?/g, () => '$' + (++idx)), values: params };
    }

    dbGet = async (sql, params = []) => {
        const { text, values } = pgSql(sql, params);
        const result = await Promise.race([
            pool.query(text, values),
            new Promise((_, rej) => setTimeout(() => rej(new Error('DB query timeout')), 5000))
        ]);
        return result.rows[0] || null;
    };

    dbAll = async (sql, params = []) => {
        const { text, values } = pgSql(sql, params);
        const { rows } = await pool.query(text, values);
        return rows;
    };

    dbRun = async (sql, params = []) => {
        const { text, values } = pgSql(sql, params);
        const result = await pool.query(text, values);
        return { changes: result.rowCount, lastID: result.rows[0]?.id };
    };

    dbClose = async () => { await pool.end(); };

    // PostgreSQL schema (IF NOT EXISTS for idempotency)
    // NOTE: column names are kept LOWERCASE (no quotes) so they match the
    // unquoted identifiers used in server.js queries. PostgreSQL folds
    // unquoted identifiers to lowercase, but quoted ones keep their case.
    schema = [
        `CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT, title TEXT, role TEXT,
            email TEXT UNIQUE NOT NULL, phone TEXT, wechat TEXT,
            country TEXT NOT NULL, city TEXT NOT NULL, interest TEXT,
            status TEXT DEFAULT 'active', registeredat TEXT, updatedat TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, content TEXT,
            location TEXT, event_date TEXT NOT NULL, event_time TEXT,
            status TEXT DEFAULT 'active', max_attendees INTEGER DEFAULT 0,
            created_at TEXT, updated_at TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS event_submissions (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT, email TEXT NOT NULL,
            phone TEXT, wechat TEXT, date TEXT NOT NULL, slot TEXT NOT NULL,
            interest TEXT, agreed INTEGER DEFAULT 0, submittedat TEXT, updatedat TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS event_registrations (
            id TEXT PRIMARY KEY, event_id TEXT NOT NULL, name TEXT NOT NULL, org TEXT,
            title TEXT, email TEXT NOT NULL, phone TEXT, wechat TEXT,
            country TEXT, city TEXT, interest TEXT, agreed INTEGER DEFAULT 0, submittedat TEXT,
            FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS news (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT, date TEXT NOT NULL,
            created_at TEXT, updated_at TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS lectures (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT, title TEXT, role TEXT,
            email TEXT NOT NULL, phone TEXT, wechat TEXT,
            country TEXT NOT NULL, city TEXT NOT NULL, date TEXT, topic TEXT,
            agreed INTEGER DEFAULT 0, submittedat TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS contact_messages (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, org TEXT, email TEXT NOT NULL,
            phone TEXT, subject TEXT NOT NULL, message TEXT NOT NULL,
            read INTEGER DEFAULT 0, submittedat TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL
        )`,
        // MTL English — student profiles & progress
        `CREATE TABLE IF NOT EXISTS mtl_students (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, save_code TEXT UNIQUE NOT NULL,
            plan TEXT DEFAULT 'free', plan_expires_at TEXT,
            created_at TEXT, last_active TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS mtl_progress (
            student_id TEXT NOT NULL, level_id INTEGER NOT NULL, game_index INTEGER NOT NULL,
            completed INTEGER DEFAULT 0, stars INTEGER DEFAULT 0, trophy INTEGER DEFAULT 0,
            updated_at TEXT, PRIMARY KEY (student_id, level_id, game_index),
            FOREIGN KEY(student_id) REFERENCES mtl_students(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS mtl_admins (
            id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS mtl_mistakes (
            id TEXT PRIMARY KEY, student_id TEXT NOT NULL, level_id INTEGER NOT NULL,
            game_index INTEGER NOT NULL, question_index INTEGER, word TEXT,
            mistake_type TEXT, reviewed INTEGER DEFAULT 0, created_at TEXT,
            FOREIGN KEY(student_id) REFERENCES mtl_students(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS mtl_skill_progress (
            student_id TEXT NOT NULL, skill TEXT NOT NULL, level_id INTEGER NOT NULL,
            lesson_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, score INTEGER DEFAULT 0,
            stars INTEGER DEFAULT 0, updated_at TEXT,
            PRIMARY KEY (student_id, skill, level_id, lesson_id),
            FOREIGN KEY(student_id) REFERENCES mtl_students(id) ON DELETE CASCADE
        )`,
        // Indexes
        `CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)`,
        `CREATE INDEX IF NOT EXISTS idx_members_registered ON members(registeredat DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_news_date ON news(date DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_mtl_progress_student ON mtl_progress(student_id)`,
    ];

} else {
    // SQLite (local dev) — try to load; if it fails (e.g. Railway without build tools), use stubs
    let sqlite3, db;
    try {
        sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ibcb.db');
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) console.error('SQLite open error:', err.message);
        });

        db.run('PRAGMA journal_mode=WAL');
        db.run('PRAGMA synchronous=NORMAL');
        db.run('PRAGMA cache_size=-8000');
        db.run('PRAGMA foreign_keys=ON');
    } catch (e) {
        console.error('sqlite3 unavailable — using stub (PostgreSQL mode requires DATABASE_URL)');
    }

    if (db) {
        dbGet = (sql, params = []) => new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('SQLite query timeout')), 5000);
            db.get(sql, params, (err, row) => { clearTimeout(t); err ? reject(err) : resolve(row); });
        });
        dbAll = (sql, params = []) => new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('SQLite query timeout')), 5000);
            db.all(sql, params, (err, rows) => { clearTimeout(t); err ? reject(err) : resolve(rows); });
        });
        dbRun = (sql, params = []) => new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('SQLite query timeout')), 5000);
            db.run(sql, params, function(err) { clearTimeout(t); err ? reject(err) : resolve(this); });
        });
        dbClose = () => new Promise((resolve) => db.close(() => resolve()));
    } else {
        // Stubs — will be replaced when DATABASE_URL is set and server restarts
        dbGet = async () => { throw new Error('Database not available'); };
        dbAll = async () => { throw new Error('Database not available'); };
        dbRun = async () => { throw new Error('Database not available'); };
        dbClose = async () => {};
    }
}

/** Initialize schema (idempotent).
 *  On SQLite: creates tables + seeds admin.
 *  On Railway before PostgreSQL is added: silently skips (stubs will throw, server stays alive for healthcheck).
 *  On Railway after PostgreSQL is added: creates tables + seeds admin.
 */
async function initDB() {
    try {
        for (const stmt of schema) {
            try { await dbRun(stmt); } catch (e) {
                console.error('Schema warn:', e.message.substring(0, 80));
            }
        }
        // ---- Migration: rename mixed-case columns to lowercase (PostgreSQL) ----
        // Earlier schema used quoted "registeredAt"/"updatedAt"/"submittedAt" which
        // PostgreSQL stores as case-sensitive. server.js queries them unquoted
        // (folded to lowercase), causing "column does not exist" errors.
        if (isPG) {
            const renames = [
                ['members', 'registeredAt', 'registeredat'],
                ['members', 'updatedAt', 'updatedat'],
                ['event_submissions', 'submittedAt', 'submittedat'],
                ['event_submissions', 'updatedAt', 'updatedat'],
                ['event_registrations', 'submittedAt', 'submittedat'],
                ['lectures', 'submittedAt', 'submittedat'],
                ['contact_messages', 'submittedAt', 'submittedat'],
            ];
            for (const [tbl, oldCol, newCol] of renames) {
                try {
                    await dbRun(`ALTER TABLE "${tbl}" RENAME COLUMN "${oldCol}" TO "${newCol}"`);
                    console.log(`Renamed ${tbl}.${oldCol} -> ${newCol}`);
                } catch (e) {
                    // column already lowercase or doesn't exist — safe to ignore
                }
            }
        }
        // Seed admin if not exists
        const bcrypt = require('bcryptjs');
        const admin = await dbGet('SELECT COUNT(*) as c FROM admins');
        if (!admin || admin.c == 0) {
            const id = 'a_' + Date.now();
            const hash = await bcrypt.hash('IBCB123!', 10);
            await dbRun('INSERT INTO admins (id, username, password) VALUES (?, ?, ?)', [id, 'admin', hash]);
            console.log('Admin seeded.');
        }
        console.log('Database initialized.');

        // MTL tables — create regardless of PG/SQLite mode
        const mtlSchema = [
            `CREATE TABLE IF NOT EXISTS mtl_students (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, save_code TEXT UNIQUE NOT NULL,
                plan TEXT DEFAULT 'free', plan_expires_at TEXT,
                created_at TEXT, last_active TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS mtl_progress (
                student_id TEXT NOT NULL, level_id INTEGER NOT NULL, game_index INTEGER NOT NULL,
                completed INTEGER DEFAULT 0, stars INTEGER DEFAULT 0, trophy INTEGER DEFAULT 0,
                updated_at TEXT, PRIMARY KEY (student_id, level_id, game_index)
            )`,
            `CREATE TABLE IF NOT EXISTS mtl_admins (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS mtl_mistakes (
                id TEXT PRIMARY KEY, student_id TEXT NOT NULL, level_id INTEGER NOT NULL,
                game_index INTEGER NOT NULL, question_index INTEGER, word TEXT,
                mistake_type TEXT, reviewed INTEGER DEFAULT 0, created_at TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS mtl_skill_progress (
                student_id TEXT NOT NULL, skill TEXT NOT NULL, level_id INTEGER NOT NULL,
                lesson_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, score INTEGER DEFAULT 0,
                stars INTEGER DEFAULT 0, updated_at TEXT,
                PRIMARY KEY (student_id, skill, level_id, lesson_id)
            )`
        ];
        for (const stmt of mtlSchema) {
            try { await dbRun(stmt); } catch (e) { console.error('MTL schema warn:', e.message.substring(0, 80)); }
        }

        // Seed MTL admin
        const mtlAdmin = await dbGet('SELECT COUNT(*) as c FROM mtl_admins');
        if (!mtlAdmin || mtlAdmin.c == 0) {
            const id = 'ma_' + Date.now();
            const hash = await bcrypt.hash('MTL2025!', 10);
            await dbRun('INSERT INTO mtl_admins (id, username, password) VALUES (?, ?, ?)', [id, 'mtladmin', hash]);
            console.log('MTL Admin seeded (mtladmin / MTL2025!).');
        }
    } catch (e) {
        console.error('initDB skipped (DB not available yet):', e.message.substring(0, 80));
    }
}

module.exports = { dbGet, dbAll, dbRun, dbClose, initDB, isPG, getDBStatus };

let dbStatus = { ready: false, error: null, type: isPG ? 'postgres' : 'sqlite' };
async function getDBStatus() {
    if (!isPG) {
        // SQLite: check if db handle exists and responds
        try {
            await Promise.race([
                dbGet('SELECT 1'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 5s')), 5000))
            ]);
            dbStatus.ready = true;
        } catch (e) {
            dbStatus.error = e.message;
        }
        return dbStatus;
    }
    try {
        await Promise.race([
            pool.query('SELECT 1'),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 5s')), 5000))
        ]);
        dbStatus.ready = true;
        return dbStatus;
    } catch (e) {
        dbStatus.error = e.message;
        return dbStatus;
    }
}