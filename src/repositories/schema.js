/**
 * Database schema migrations as an ordered array of SQL statements.
 * Each runs via CREATE TABLE IF NOT EXISTS — idempotent, safe to re-run.
 */
module.exports = [
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    org TEXT,
    title TEXT,
    role TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    wechat TEXT,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    interest TEXT,
    status TEXT DEFAULT 'active',
    registeredAt TEXT,
    updatedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS event_submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    org TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    wechat TEXT,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    interest TEXT,
    agreed INTEGER DEFAULT 0,
    submittedAt TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    date TEXT NOT NULL,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`
];
