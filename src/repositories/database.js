const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'ibcb.db');

/**
 * Promisified SQLite database wrapper.
 * Eliminates callback-hell in server.js by wrapping sqlite3 in Promises.
 */
class Database {
  constructor(dbPath = DB_PATH) {
    this.db = new sqlite3.Database(dbPath);
    this._ready = this._runMigrations();
  }

  async _runMigrations() {
    const schema = require('./schema');
    for (const stmt of schema) {
      await this.run(stmt);
    }
  }

  /** Execute a statement with ? placeholders */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    });
  }

  /** Fetch a single row */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  /** Fetch all rows */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /** Close the database connection */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

// Singleton
let instance = null;

Database.getInstance = () => {
  if (!instance) instance = new Database();
  return instance;
};

module.exports = Database;
