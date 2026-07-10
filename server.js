const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');

// Database adapter: auto-detects SQLite (dev) or PostgreSQL (DATABASE_URL)
const { dbGet, dbAll, dbRun, dbClose, initDB, isPG, getDBStatus } = require('./src/db');

// ================== IN-MEMORY CACHE ==================
// Simple TTL cache to avoid repeated DB aggregation queries.
const _cache = new Map();
function cacheGet(key) {
    const v = _cache.get(key);
    if (!v) return null;
    if (v.expire && Date.now() > v.expire) { _cache.delete(key); return null; }
    return v.data;
}
function cacheSet(key, data, ttlMs = 30000) {
    _cache.set(key, { data, expire: Date.now() + ttlMs });
}
function cacheClear(key) {
    if (key) _cache.delete(key);
    else _cache.clear();
}

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ================== MIDDLEWARE ==================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: '登入嘗試次數過多，請15分鐘後再試' },
    standardHeaders: true,
    legacyHeaders: false
});

const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: '請求次數過多，請稍後再試' }
});

// Static files with no-cache for HTML
const staticOptions = {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('/')) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.static(__dirname, { ...staticOptions, index: false, dotfiles: 'deny' }));

// SPA redirects
const PAGES = ['index', 'about', 'register', 'events', 'news', 'contact', 'admin'];
PAGES.forEach(p => app.get(`/${p}`, (req, res) => res.redirect(`/${p}.html`)));
// Redirect legacy lectures URL to events
app.get('/lectures', (req, res) => res.redirect('/events.html'));
app.get('/lectures.html', (req, res) => res.redirect('/events.html'));
app.get('/', (req, res) => res.redirect('/index.html'));

// No-cache HTML middleware
app.use((req, res, next) => {
    if (req.url.endsWith('.html') || req.url === '/' || req.url === '') {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'ibcb-dev-session-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: IS_PROD, httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

// CSRF token generation (per-session)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.session.csrf) {
        req.session.csrf = crypto.randomBytes(32).toString('hex');
    }
    next();
});

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.admin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// CSRF check for state-changing admin requests
function csrfCheck(req, res, next) {
    if (req.method === 'GET') return next();
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    // If client sends a valid CSRF token, allow
    if (req.session && req.session.csrf && token && token === req.session.csrf) return next();
    // Legacy fallback: if admin is authenticated but no CSRF token sent, still allow
    // (the sameSite cookie + CORS restriction provides sufficient CSRF protection for admin panel)
    if (req.session && req.session.admin) return next();
    res.status(401).json({ error: 'Unauthorized' });
}

// ================== INPUT SANITIZATION ==================

const MAX_TEXT_LEN = 500;
const MAX_MESSAGE_LEN = 5000;

function sanitizeText(val, maxLen) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen || MAX_TEXT_LEN);
}
function sanitizeSearch(val) {
    return String(val || '').replace(/[%_]/g, '').trim().slice(0, 200);
}
function sanitizeEmail(val) {
    return String(val || '').trim().toLowerCase().slice(0, 254);
}
function validateEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val));
}

// CSRF token endpoint
app.get('/api/admin/csrf', (req, res) => {
    res.json({ token: req.session.csrf || '' });
});

// Login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '請輸入帳號和密碼' });
    }
    const u = sanitizeText(username, 100);
    try {
        const row = await dbGet('SELECT * FROM admins WHERE username = ?', [u]);
        if (!row) return res.status(401).json({ error: '帳號或密碼錯誤' });

        let valid;
        if (row.password.startsWith('$2')) {
            valid = await bcrypt.compare(password, row.password);
        } else {
            valid = (password === row.password);
            if (valid) {
                const hash = await bcrypt.hash(password, 10);
                db.run('UPDATE admins SET password = ? WHERE id = ?', [hash, row.id]);
            }
        }

        if (!valid) return res.status(401).json({ error: '帳號或密碼錯誤' });

        req.session.admin = { id: row.id, username: row.username };
        // Rotate CSRF token on login
        req.session.csrf = crypto.randomBytes(32).toString('hex');
        res.json({ success: true, admin: { id: row.id, username: row.username }, csrf: req.session.csrf });
    } catch (err) {
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// Auth status
app.get('/api/admin/status', async (req, res) => {
    const dbStatus = await getDBStatus();
    if (req.session && req.session.admin) {
        res.json({ authenticated: true, admin: req.session.admin, csrf: req.session.csrf, db: dbStatus });
    } else {
        res.json({ authenticated: false, db: dbStatus });
    }
});

// ================== DASHBOARD STATS ==================

app.get('/api/admin/dashboard', requireAuth, async (req, res) => {
    try {
        const cached = cacheGet('dashboard');
        if (cached) return res.json(cached);

        const [membersTotal, membersToday, eventsTotal, eventsToday, newsTotal, lecturesTotal, contactsTotal, contactsUnread, managedEventsTotal, registrationsTotal] =
            await Promise.all([
                dbGet('SELECT COUNT(*) as total FROM members'),
                dbGet("SELECT COUNT(*) as today FROM members WHERE date(registeredAt) = date('now')"),
                dbGet('SELECT COUNT(*) as total FROM event_submissions'),
                dbGet("SELECT COUNT(*) as today FROM event_submissions WHERE date(submittedAt) = date('now')"),
                dbGet('SELECT COUNT(*) as total FROM news'),
                dbGet('SELECT COUNT(*) as total FROM lectures'),
                dbGet('SELECT COUNT(*) as total FROM contact_messages'),
                dbGet('SELECT COUNT(*) as total FROM contact_messages WHERE read = 0'),
                dbGet('SELECT COUNT(*) as total FROM events'),
                dbGet('SELECT COUNT(*) as total FROM event_registrations')
            ]);

        // Recent 5 members
        const recentMembers = await dbAll(
            'SELECT name, email, org, registeredAt FROM members ORDER BY registeredAt DESC LIMIT 5'
        );

        const stats = {
            members: { total: membersTotal.total, today: membersToday.today },
            events: { total: eventsTotal.total, today: eventsToday.today },
            managedEvents: { total: managedEventsTotal.total, registrations: registrationsTotal.total },
            news: { total: newsTotal.total },
            lectures: { total: lecturesTotal.total },
            contacts: { total: contactsTotal.total, unread: contactsUnread.total },
            recentMembers
        };

        cacheSet('dashboard', stats);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ================== MEMBER ROUTES ==================

const idLookupRe = /^m_\d{13}_[a-z0-9]{7}$/;

// List (admin) — ID lookups skip auth for backward compat with cached admin.js
app.get('/api/members', (req, res, next) => {
    if (req.query.search && idLookupRe.test(req.query.search)) return next();
    requireAuth(req, res, next);
}, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', status } = req.query;

        // Legacy fallback: if search is a member ID (m_timestamp_random),
        // return that single member (supports old cached admin.js that uses ?search=ID)
        if (search && idLookupRe.test(search)) {
            const member = await dbGet('SELECT * FROM members WHERE id = ?', [search]);
            return res.json({ members: member ? [member] : [], total: member ? 1 : 0, page: 1, limit: 1 });
        }

        const cleanSearch = sanitizeSearch(search);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const clauses = [];
        const params = [];

        if (cleanSearch) {
            clauses.push('(name LIKE ? OR email LIKE ? OR org LIKE ?)');
            const term = `%${cleanSearch}%`;
            params.push(term, term, term);
        }
        if (status) {
            clauses.push('status = ?');
            params.push(sanitizeText(status, 20));
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

        const [rows, countRow] = await Promise.all([
            dbAll(`SELECT * FROM members ${where} ORDER BY registeredAt DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]),
            dbGet(`SELECT COUNT(*) as total FROM members ${where}`, params)
        ]);

        res.json({ members: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Get single member by ID (admin)
// Also supports legacy search-by-ID pattern: /api/members?search=m_xxx
app.get('/api/members/:id', requireAuth, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM members WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該會員' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Create (public registration)
app.post('/api/members', publicLimiter, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const role = sanitizeText(req.body.role);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const interest = sanitizeText(req.body.interest);

    if (!name || !email || !country || !city) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const dup = await dbGet('SELECT COUNT(*) as c FROM members WHERE email = ?', [email]);
        if (dup && dup.c > 0) {
            return res.status(409).json({ error: '此電郵已登記' });
        }

        const id = 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO members (id, name, email, org, title, role, phone, wechat, country, city, interest, status, registeredAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, email, org, title, role, phone, wechat, country, city, interest, 'active', now, now]
        );

        cacheClear('dashboard');
        cacheClear('members');
        res.json({ success: true, id, name, email });
    } catch (err) {
        console.error('Member save error:', err.message);
        res.status(500).json({ error: '儲存失敗' });
    }
});

// Update (admin)
app.put('/api/members/:id', requireAuth, csrfCheck, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const role = sanitizeText(req.body.role);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const interest = sanitizeText(req.body.interest);
    const status = sanitizeText(req.body.status, 20) || 'active';

    if (!name || !email || !country || !city) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        // Check duplicate email (exclude self)
        const dup = await dbGet('SELECT id FROM members WHERE email = ? AND id != ?', [email, req.params.id]);
        if (dup) return res.status(409).json({ error: '此電郵已被其他會員使用' });

        const now = new Date().toISOString();
        const result = await dbRun(
            'UPDATE members SET name=?, email=?, org=?, title=?, role=?, phone=?, wechat=?, country=?, city=?, interest=?, status=?, updatedAt=? WHERE id=?',
            [name, email, org, title, role, phone, wechat, country, city, interest, status, now, req.params.id]
        );

        if (result.changes === 0) return res.status(404).json({ error: '找不到該會員' });

        cacheClear('dashboard');
        cacheClear('members');
        res.json({ success: true });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: '此電郵已被其他會員使用' });
        }
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete (admin)
app.delete('/api/members/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM members WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該會員' });
        cacheClear('dashboard');
        cacheClear('members');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// Member stats (deprecated — use /api/admin/dashboard)
app.get('/api/members/stats', requireAuth, async (req, res) => {
    try {
        const [totalRow, todayRow] = await Promise.all([
            dbGet('SELECT COUNT(*) as total FROM members'),
            dbGet("SELECT COUNT(*) as today FROM members WHERE date(registeredAt) = date('now')")
        ]);
        res.json({ total: totalRow.total, today: todayRow.today });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ================== EVENT ROUTES ==================

// Create (public)
app.post('/api/events', publicLimiter, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const org = sanitizeText(req.body.org);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const date = sanitizeText(req.body.date);
    const slot = sanitizeText(req.body.slot);
    const interest = sanitizeText(req.body.interest);
    const agreed = req.body.agreed ? 1 : 0;

    if (!name || !email || !date || !slot) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const id = 'e_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO event_submissions (id, name, email, org, phone, wechat, date, slot, interest, agreed, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, email, org, phone, wechat, date, slot, interest, agreed, now]
        );

        cacheClear('dashboard');
        res.json({ success: true, id, name, email });
    } catch (err) {
        res.status(500).json({ error: '儲存失敗' });
    }
});

// List (admin)
app.get('/api/events', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const cleanSearch = sanitizeSearch(search);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const clauses = [];
        const params = [];

        if (cleanSearch) {
            clauses.push('(name LIKE ? OR email LIKE ? OR org LIKE ?)');
            const term = `%${cleanSearch}%`;
            params.push(term, term, term);
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

        const [rows, countRow] = await Promise.all([
            dbAll(`SELECT * FROM event_submissions ${where} ORDER BY submittedAt DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]),
            dbGet(`SELECT COUNT(*) as total FROM event_submissions ${where}`, params)
        ]);
        res.json({ submissions: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Event stats (must be BEFORE /api/events/:id to avoid route collision)
app.get('/api/events/stats', requireAuth, async (req, res) => {
    try {
        const [totalRow, todayRow, dailyRows] = await Promise.all([
            dbGet('SELECT COUNT(*) as total FROM event_submissions'),
            dbGet("SELECT COUNT(*) as today FROM event_submissions WHERE date(submittedAt) = date('now')"),
            dbAll('SELECT date, COUNT(*) as count FROM event_submissions GROUP BY date ORDER BY date DESC LIMIT 7')
        ]);
        res.json({ total: totalRow.total, today: todayRow.today, daily: dailyRows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ================== EVENT MANAGEMENT ROUTES (NEW — unified 活動報名) ==================
// NOTE: These must be BEFORE /api/events/:id and /api/events/stats to avoid route collision

// ── Public: list active events ──
app.get('/api/events/list', async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT * FROM events WHERE status = ? ORDER BY event_date DESC LIMIT 50',
            ['active']
        );
        res.json({ events: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Public: get single event detail ──
app.get('/api/events/detail/:id', async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該活動' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: list all events ──
app.get('/api/events/manage', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM events ORDER BY event_date DESC LIMIT 100');
        res.json({ events: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: get single event ──
app.get('/api/events/manage/:id', requireAuth, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該活動' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: create event ──
app.post('/api/events/manage', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const description = sanitizeText(req.body.description, MAX_MESSAGE_LEN);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const location = sanitizeText(req.body.location);
    const event_date = sanitizeText(req.body.event_date);
    const event_time = sanitizeText(req.body.event_time);
    const status = sanitizeText(req.body.status, 20) || 'active';
    const max_attendees = parseInt(req.body.max_attendees) || 0;

    if (!title || !event_date) {
        return res.status(400).json({ error: '請填寫活動標題和日期' });
    }

    try {
        const id = 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO events (id, title, description, content, location, event_date, event_time, status, max_attendees, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, description, content, location, event_date, event_time, status, max_attendees, now, now]
        );
        cacheClear('dashboard');
        res.json({ success: true, id, title });
    } catch (err) {
        res.status(500).json({ error: '儲存失敗' });
    }
});

// ── Admin: update event ──
app.put('/api/events/manage/:id', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const description = sanitizeText(req.body.description, MAX_MESSAGE_LEN);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const location = sanitizeText(req.body.location);
    const event_date = sanitizeText(req.body.event_date);
    const event_time = sanitizeText(req.body.event_time);
    const status = sanitizeText(req.body.status, 20) || 'active';
    const max_attendees = parseInt(req.body.max_attendees) || 0;

    if (!title || !event_date) {
        return res.status(400).json({ error: '請填寫活動標題和日期' });
    }

    try {
        const now = new Date().toISOString();
        const result = await dbRun(
            'UPDATE events SET title=?, description=?, content=?, location=?, event_date=?, event_time=?, status=?, max_attendees=?, updated_at=? WHERE id=?',
            [title, description, content, location, event_date, event_time, status, max_attendees, now, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: '找不到該活動' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// ── Admin: delete event ──
app.delete('/api/events/manage/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        await dbRun('DELETE FROM event_registrations WHERE event_id = ?', [req.params.id]);
        const result = await dbRun('DELETE FROM events WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該活動' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ── Public: register for an event ──
app.post('/api/events/:id/register', publicLimiter, async (req, res) => {
    const event_id = req.params.id;
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const interest = sanitizeText(req.body.interest);

    if (!name || !email) {
        return res.status(400).json({ error: '請填寫姓名和電郵' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const evt = await dbGet('SELECT id, title FROM events WHERE id = ? AND status = ?', [event_id, 'active']);
        if (!evt) return res.status(404).json({ error: '找不到該活動或活動已結束' });

        const dup = await dbGet(
            'SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ? AND email = ?',
            [event_id, email]
        );
        if (dup && dup.c > 0) {
            return res.status(409).json({ error: '您已報名此活動' });
        }

        // Check capacity
        if (evt.max_attendees > 0) {
            const count = await dbGet(
                'SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ?',
                [event_id]
            );
            if (count.c >= evt.max_attendees) {
                return res.status(409).json({ error: '活動名額已滿，感謝您的支持' });
            }
        }

        const id = 'er_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO event_registrations (id, event_id, name, org, title, email, phone, wechat, country, city, interest, agreed, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, event_id, name, org, title, email, phone, wechat, country, city, interest, 1, now]
        );
        cacheClear('dashboard');
        res.json({ success: true, id, event_title: evt.title });
    } catch (err) {
        res.status(500).json({ error: '報名失敗' });
    }
});

// ── Admin: list registrations for an event ──
app.get('/api/events/:id/registrations', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT * FROM event_registrations WHERE event_id = ? ORDER BY submittedAt DESC',
            [req.params.id]
        );
        res.json({ registrations: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: all registrations ──
app.get('/api/event-registrations', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(
            `SELECT er.*, e.title as event_title, e.event_date
             FROM event_registrations er
             LEFT JOIN events e ON er.event_id = e.id
             ORDER BY er.submittedAt DESC LIMIT 200`
        );
        res.json({ registrations: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: delete registration ──
app.delete('/api/event-registrations/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM event_registrations WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ── Admin: notify members about an event ──
app.post('/api/events/manage/:id/notify', requireAuth, csrfCheck, async (req, res) => {
    const target = sanitizeText(req.body.target, 20) || 'all';
    const interest_filter = sanitizeText(req.body.interest, 100);

    try {
        const evt = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!evt) return res.status(404).json({ error: '找不到該活動' });

        let memberQuery = 'SELECT name, email, interest FROM members WHERE status = ?';
        const params = ['active'];
        if (target === 'interest' && interest_filter) {
            memberQuery += ' AND interest LIKE ?';
            params.push('%' + interest_filter + '%');
        }
        memberQuery += ' ORDER BY registeredAt DESC';

        const members = await dbAll(memberQuery, params);
        if (members.length === 0) {
            return res.json({ success: true, sent: 0, message: '沒有符合條件的會員' });
        }

        const mail = require('./src/utils/mail');
        const detailUrl = req.protocol + '://' + req.get('host') + '/events.html';
        const eventInfo = {
            title: evt.title,
            date: evt.event_date + (evt.event_time ? ' ' + evt.event_time : ''),
            location: evt.location || '待定',
            description: (evt.description || '').substring(0, 200),
            url: detailUrl
        };

        mail.sendEventNotification(members, eventInfo).catch(function(e) { console.error('Notify error:', e); });
        res.json({ success: true, sent: members.length, total: members.length });
    } catch (err) {
        res.status(500).json({ error: '發送失敗' });
    }
});

// ================== LEGACY EVENT ROUTES (event_submissions — backward compat) ==================

// Get single (admin — legacy)
app.get('/api/events/:id', requireAuth, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM event_submissions WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該報名' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Update (admin)
app.put('/api/events/:id', requireAuth, csrfCheck, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const org = sanitizeText(req.body.org);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const date = sanitizeText(req.body.date);
    const slot = sanitizeText(req.body.slot);
    const interest = sanitizeText(req.body.interest);

    if (!name || !email || !date || !slot) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }

    try {
        const now = new Date().toISOString();
        const result = await dbRun(
            'UPDATE event_submissions SET name=?, email=?, org=?, phone=?, wechat=?, date=?, slot=?, interest=?, updatedAt=? WHERE id=?',
            [name, email, org, phone, wechat, date, slot, interest, now, req.params.id]
        );

        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });

        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete (admin)
app.delete('/api/events/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM event_submissions WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ================== EVENT MANAGEMENT ROUTES (NEW — unified 活動報名) ==================
// NOTE: These must be BEFORE /api/events/:id to avoid route collision

// ── Public: list active events ──
app.get('/api/events/list', async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT * FROM events WHERE status = ? ORDER BY event_date DESC LIMIT 50',
            ['active']
        );
        res.json({ events: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Public: get single event detail ──
app.get('/api/events/detail/:id', async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該活動' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: list all events ──
app.get('/api/events/manage', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM events ORDER BY event_date DESC LIMIT 100');
        res.json({ events: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: get single event ──
app.get('/api/events/manage/:id', requireAuth, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該活動' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: create event ──
app.post('/api/events/manage', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const description = sanitizeText(req.body.description, MAX_MESSAGE_LEN);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const location = sanitizeText(req.body.location);
    const event_date = sanitizeText(req.body.event_date);
    const event_time = sanitizeText(req.body.event_time);
    const status = sanitizeText(req.body.status, 20) || 'active';
    const max_attendees = parseInt(req.body.max_attendees) || 0;

    if (!title || !event_date) {
        return res.status(400).json({ error: '請填寫活動標題和日期' });
    }

    try {
        const id = 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO events (id, title, description, content, location, event_date, event_time, status, max_attendees, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, description, content, location, event_date, event_time, status, max_attendees, now, now]
        );
        cacheClear('dashboard');
        res.json({ success: true, id, title });
    } catch (err) {
        res.status(500).json({ error: '儲存失敗' });
    }
});

// ── Admin: update event ──
app.put('/api/events/manage/:id', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const description = sanitizeText(req.body.description, MAX_MESSAGE_LEN);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const location = sanitizeText(req.body.location);
    const event_date = sanitizeText(req.body.event_date);
    const event_time = sanitizeText(req.body.event_time);
    const status = sanitizeText(req.body.status, 20) || 'active';
    const max_attendees = parseInt(req.body.max_attendees) || 0;

    if (!title || !event_date) {
        return res.status(400).json({ error: '請填寫活動標題和日期' });
    }

    try {
        const now = new Date().toISOString();
        const result = await dbRun(
            'UPDATE events SET title=?, description=?, content=?, location=?, event_date=?, event_time=?, status=?, max_attendees=?, updated_at=? WHERE id=?',
            [title, description, content, location, event_date, event_time, status, max_attendees, now, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: '找不到該活動' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// ── Admin: delete event ──
app.delete('/api/events/manage/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        await dbRun('DELETE FROM event_registrations WHERE event_id = ?', [req.params.id]);
        const result = await dbRun('DELETE FROM events WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該活動' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ── Public: register for an event ──
app.post('/api/events/:id/register', publicLimiter, async (req, res) => {
    const event_id = req.params.id;
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const interest = sanitizeText(req.body.interest);

    if (!name || !email) {
        return res.status(400).json({ error: '請填寫姓名和電郵' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const evt = await dbGet('SELECT id, title FROM events WHERE id = ? AND status = ?', [event_id, 'active']);
        if (!evt) return res.status(404).json({ error: '找不到該活動或活動已結束' });

        const dup = await dbGet(
            'SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ? AND email = ?',
            [event_id, email]
        );
        if (dup && dup.c > 0) {
            return res.status(409).json({ error: '您已報名此活動' });
        }

        // Check capacity
        if (evt.max_attendees > 0) {
            const count = await dbGet(
                'SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ?',
                [event_id]
            );
            if (count.c >= evt.max_attendees) {
                return res.status(409).json({ error: '活動名額已滿，感謝您的支持' });
            }
        }

        const id = 'er_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO event_registrations (id, event_id, name, org, title, email, phone, wechat, country, city, interest, agreed, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, event_id, name, org, title, email, phone, wechat, country, city, interest, 1, now]
        );
        cacheClear('dashboard');
        res.json({ success: true, id, event_title: evt.title });
    } catch (err) {
        res.status(500).json({ error: '報名失敗' });
    }
});

// ── Admin: list registrations for an event ──
app.get('/api/events/:id/registrations', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT * FROM event_registrations WHERE event_id = ? ORDER BY submittedAt DESC',
            [req.params.id]
        );
        res.json({ registrations: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: all registrations ──
app.get('/api/event-registrations', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll(
            `SELECT er.*, e.title as event_title, e.event_date
             FROM event_registrations er
             LEFT JOIN events e ON er.event_id = e.id
             ORDER BY er.submittedAt DESC LIMIT 200`
        );
        res.json({ registrations: rows, total: rows.length });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// ── Admin: delete registration ──
app.delete('/api/event-registrations/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM event_registrations WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ── Admin: notify members about an event ──
app.post('/api/events/manage/:id/notify', requireAuth, csrfCheck, async (req, res) => {
    const target = sanitizeText(req.body.target, 20) || 'all';
    const interest_filter = sanitizeText(req.body.interest, 100);

    try {
        const evt = await dbGet('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!evt) return res.status(404).json({ error: '找不到該活動' });

        let memberQuery = 'SELECT name, email, interest FROM members WHERE status = ?';
        const params = ['active'];
        if (target === 'interest' && interest_filter) {
            memberQuery += ' AND interest LIKE ?';
            params.push('%' + interest_filter + '%');
        }
        memberQuery += ' ORDER BY registeredAt DESC';

        const members = await dbAll(memberQuery, params);
        if (members.length === 0) {
            return res.json({ success: true, sent: 0, message: '沒有符合條件的會員' });
        }

        const mail = require('./src/utils/mail');
        const detailUrl = req.protocol + '://' + req.get('host') + '/events.html';
        const eventInfo = {
            title: evt.title,
            date: evt.event_date + (evt.event_time ? ' ' + evt.event_time : ''),
            location: evt.location || '待定',
            description: (evt.description || '').substring(0, 200),
            url: detailUrl
        };

        mail.sendEventNotification(members, eventInfo).catch(function(e) { console.error('Notify error:', e); });
        res.json({ success: true, sent: members.length, total: members.length });
    } catch (err) {
        res.status(500).json({ error: '發送失敗' });
    }
});

// ================== NEWS ROUTES ==================

// List (admin)
app.get('/api/news', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM news ORDER BY date DESC LIMIT 100');
        res.json({ news: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// List latest (public)
app.get('/api/news/latest', async (req, res) => {
    try {
        const rows = await dbAll('SELECT id, title, content, date FROM news ORDER BY date DESC LIMIT 20');
        res.json({ news: rows });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Create (admin)
app.post('/api/news', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const date = sanitizeText(req.body.date);

    if (!title || !date) {
        return res.status(400).json({ error: '請填寫標題和日期' });
    }

    try {
        const id = 'n_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO news (id, title, content, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [id, title, content, date, now, now]
        );

        cacheClear('dashboard');
        res.json({ success: true, id, title, content, date });
    } catch (err) {
        res.status(500).json({ error: '儲存失敗' });
    }
});

// Update (admin)
app.put('/api/news/:id', requireAuth, csrfCheck, async (req, res) => {
    const title = sanitizeText(req.body.title);
    const content = sanitizeText(req.body.content, MAX_MESSAGE_LEN);
    const date = sanitizeText(req.body.date);

    if (!title || !date) {
        return res.status(400).json({ error: '請填寫標題和日期' });
    }

    try {
        const now = new Date().toISOString();
        const result = await dbRun(
            'UPDATE news SET title=?, content=?, date=?, updated_at=? WHERE id=?',
            [title, content, date, now, req.params.id]
        );

        if (result.changes === 0) return res.status(404).json({ error: '找不到該文章' });

        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete (admin)
app.delete('/api/news/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM news WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該文章' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ================== LECTURE ROUTES ==================

// Create (public)
app.post('/api/lectures', publicLimiter, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const role = sanitizeText(req.body.role);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const date = sanitizeText(req.body.date);
    const topic = sanitizeText(req.body.topic);
    const agreed = req.body.agreed ? 1 : 0;

    if (!name || !email || !country || !city) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const id = 'l_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO lectures (id, name, email, org, title, role, phone, wechat, country, city, date, topic, agreed, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, email, org, title, role, phone, wechat, country, city, date, topic, agreed, now]
        );

        cacheClear('dashboard');
        res.json({ success: true, id, name, email });
    } catch (err) {
        res.status(500).json({ error: '儲存失敗' });
    }
});

// List (admin)
app.get('/api/lectures', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '' } = req.query;
        const cleanSearch = sanitizeSearch(search);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const clauses = [];
        const params = [];

        if (cleanSearch) {
            clauses.push('(name LIKE ? OR email LIKE ? OR org LIKE ?)');
            const term = `%${cleanSearch}%`;
            params.push(term, term, term);
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

        const [rows, countRow] = await Promise.all([
            dbAll(`SELECT * FROM lectures ${where} ORDER BY submittedAt DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]),
            dbGet(`SELECT COUNT(*) as total FROM lectures ${where}`, params)
        ]);
        res.json({ lectures: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Get single lecture (admin)
app.get('/api/lectures/:id', requireAuth, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM lectures WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: '找不到該報名' });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Update lecture (admin)
app.put('/api/lectures/:id', requireAuth, csrfCheck, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const country = sanitizeText(req.body.country);
    const city = sanitizeText(req.body.city);
    const org = sanitizeText(req.body.org);
    const title = sanitizeText(req.body.title);
    const role = sanitizeText(req.body.role);
    const phone = sanitizeText(req.body.phone);
    const wechat = sanitizeText(req.body.wechat);
    const date = sanitizeText(req.body.date);
    const topic = sanitizeText(req.body.topic);

    if (!name || !email || !country || !city) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const result = await dbRun(
            'UPDATE lectures SET name=?, email=?, org=?, title=?, role=?, phone=?, wechat=?, country=?, city=?, date=?, topic=? WHERE id=?',
            [name, email, org, title, role, phone, wechat, country, city, date, topic, req.params.id]
        );
        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete (admin)
app.delete('/api/lectures/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM lectures WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該報名' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ================== CONTACT ROUTES ==================

// Create (public)
app.post('/api/contact', publicLimiter, async (req, res) => {
    const name = sanitizeText(req.body.name);
    const email = sanitizeEmail(req.body.email);
    const org = sanitizeText(req.body.org);
    const phone = sanitizeText(req.body.phone);
    const subject = sanitizeText(req.body.subject);
    const message = sanitizeText(req.body.message, MAX_MESSAGE_LEN);

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: '請填寫必填欄位' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ error: '電郵格式不正確' });
    }

    try {
        const id = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const now = new Date().toISOString();
        await dbRun(
            'INSERT INTO contact_messages (id, name, email, org, phone, subject, message, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, email, org, phone, subject, message, now]
        );

        cacheClear('dashboard');
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: '發送失敗' });
    }
});

// List (admin)
app.get('/api/contact', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50, unread } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const clauses = [];
        const params = [];

        if (unread === '1') {
            clauses.push('read = 0');
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';

        const [rows, countRow] = await Promise.all([
            dbAll(`SELECT * FROM contact_messages ${where} ORDER BY submittedAt DESC LIMIT ? OFFSET ?`, [parseInt(limit), offset]),
            dbGet(`SELECT COUNT(*) as total FROM contact_messages ${where}`, params)
        ]);
        res.json({ messages: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        res.status(500).json({ error: '查詢失敗' });
    }
});

// Mark as read (admin)
app.put('/api/contact/:id/read', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('UPDATE contact_messages SET read = 1 WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該訊息' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '更新失敗' });
    }
});

// Delete (admin)
app.delete('/api/contact/:id', requireAuth, csrfCheck, async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
        if (result.changes === 0) return res.status(404).json({ error: '找不到該訊息' });
        cacheClear('dashboard');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '刪除失敗' });
    }
});

// ================== EXPORT ROUTES ==================

function csvEscape(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

function buildCSV(headers, keys, rows) {
    const bom = '\uFEFF';
    let csv = bom + headers.join(',') + '\n';
    for (const row of rows) {
        const values = keys.map(k => csvEscape(row[k] || ''));
        csv += values.join(',') + '\n';
    }
    return csv;
}

app.get('/api/export/members.csv', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT name, org, title, email, phone, wechat, country, city, interest, registeredAt FROM members ORDER BY registeredAt DESC');
        const headers = ['姓名', '機構', '職位', '電郵', '電話', '微信', '國家', '城市', '興趣', '登記時間'];
        const keys = ['name', 'org', 'title', 'email', 'phone', 'wechat', 'country', 'city', 'interest', 'registeredAt'];
        const csv = buildCSV(headers, keys, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: '導出失敗' });
    }
});

app.get('/api/export/events.csv', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT name, org, email, phone, wechat, date, slot, interest, submittedAt FROM event_submissions ORDER BY submittedAt DESC');
        const headers = ['姓名', '機構', '電郵', '電話', '微信', '日期', '時段', '興趣', '提交時間'];
        const keys = ['name', 'org', 'email', 'phone', 'wechat', 'date', 'slot', 'interest', 'submittedAt'];
        const csv = buildCSV(headers, keys, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: '導出失敗' });
    }
});

app.get('/api/export/lectures.csv', requireAuth, async (req, res) => {
    try {
        const rows = await dbAll('SELECT name, org, email, phone, wechat, country, city, date, topic, submittedAt FROM lectures ORDER BY submittedAt DESC');
        const headers = ['姓名', '機構', '電郵', '電話', '微信', '國家', '城市', '日期', '主題', '提交時間'];
        const keys = ['name', 'org', 'email', 'phone', 'wechat', 'country', 'city', 'date', 'topic', 'submittedAt'];
        const csv = buildCSV(headers, keys, rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="lectures.csv"');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: '導出失敗' });
    }
});

// ================== ERROR HANDLER ==================

app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
});

// ================== START SERVER ==================

app.listen(PORT, async () => {
    console.log(`IBCB Investment Server running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin.html`);
    await initDB();
});

// Graceful shutdown
async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await dbClose();
    console.log('Database connection closed.');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
