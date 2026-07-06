/**
 * IBCB Investment — Refactored Server
 * Layered architecture: Routes → Services → Repositories → Database
 * 
 * SOLID Principles Applied:
 * - SRP: Each module has one reason to change
 * - OCP: Entity types extend BaseRepository, new entities don't modify existing code
 * - DIP: Routes depend on Service abstractions, not DB details
 * 
 * Patterns: Repository, Service, Strategy (validators), Singleton (DB)
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const { errorHandler, requireAuth } = require('./src/middleware/middleware');
const { AuthService, EventService, NewsService } = require('./src/services/services');
const { eventExporter } = require('./src/utils/csv');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files with no-cache for HTML
const staticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use(express.static(__dirname, staticOptions));

// SPA-like redirects
const PAGES = ['index', 'about', 'register', 'lectures', 'events', 'news', 'contact', 'admin'];
PAGES.forEach(p => app.get(`/${p}`, (_, res) => res.redirect(`/${p}.html`)));
app.get('/', (_, res) => res.redirect('/index.html'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'ibcb_admin_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// ── Routes ──────────────────────────────────────
// Modular entity routes
app.use('/api/members', require('./src/routes/memberRoutes'));

// Event routes
app.post('/api/events', async (req, res, next) => {
  try {
    const result = await new EventService().create(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) { next(e); }
});
app.get('/api/events', requireAuth, async (req, res, next) => {
  try {
    const result = await new EventService().list(req.query);
    res.json(result);
  } catch (e) { next(e); }
});
app.get('/api/events/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await new EventService().stats();
    res.json(result);
  } catch (e) { next(e); }
});
app.get('/api/export/events.csv', requireAuth, async (req, res, next) => {
  try {
    const EventRepo = require('./src/repositories/entityRepositories').EventRepository;
    const rows = await new EventRepo().findAll({ orderBy: 'submittedAt DESC' });
    const csv = eventExporter.generate(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

// News routes
app.get('/api/news', requireAuth, async (req, res, next) => {
  try {
    const news = await new NewsService().listRecent();
    res.json({ news });
  } catch (e) { next(e); }
});
app.post('/api/news', requireAuth, async (req, res, next) => {
  try {
    const result = await new NewsService().create(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) { next(e); }
});
app.delete('/api/news/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await new NewsService().delete(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
});

// Auth routes
const authService = new AuthService();
app.post('/api/admin/login', async (req, res, next) => {
  try {
    const admin = await authService.login(req.body.username, req.body.password);
    req.session.admin = admin;
    res.json({ success: true, admin });
  } catch (e) { next(e); }
});
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});
app.get('/api/admin/status', (req, res) => {
  if (req.session && req.session.admin) {
    res.json({ authenticated: true, admin: req.session.admin });
  } else {
    res.json({ authenticated: false });
  }
});

// ── Error Handler (must be LAST) ────────────────
app.use(errorHandler);

// ── Start ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`IBCB Investment Server → http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  const Database = require('./src/repositories/database');
  const db = Database.getInstance();
  await db.close();
  console.log('DB closed. Exiting.');
  process.exit(0);
});
