const db = require('./database').getInstance();

/**
 * Utility: generate unique prefixed IDs (Strategy pattern — ID generation is injectable).
 */
const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Base repository with common CRUD operations.
 * Repositories abstract all SQL — Domain classes never touch raw SQL.
 */
class BaseRepository {
  constructor(table, idPrefix) {
    this.table = table;
    this.idPrefix = idPrefix;
    this.makeId = () => makeId(idPrefix);
  }

  async findAll({ where = '', params = [], orderBy = '', limit, offset } = {}) {
    const clauses = [
      where ? `WHERE ${where}` : '',
      orderBy ? `ORDER BY ${orderBy}` : '',
      limit != null ? `LIMIT ${limit}` : '',
      offset != null ? `OFFSET ${offset}` : ''
    ].filter(Boolean).join(' ');
    return db.all(`SELECT * FROM ${this.table} ${clauses}`, params);
  }

  async findById(id) {
    return db.get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  }

  async findBy(field, value) {
    return db.get(`SELECT * FROM ${this.table} WHERE ${field} = ?`, [value]);
  }

  async count(where = '', params = []) {
    const clause = where ? `WHERE ${where}` : '';
    const row = await db.get(`SELECT COUNT(*) as total FROM ${this.table} ${clause}`, params);
    return row ? row.total : 0;
  }

  async insert(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    await db.run(
      `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
  }

  async update(id, data) {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    const result = await db.run(`UPDATE ${this.table} SET ${sets} WHERE id = ?`, values);
    return result.changes;
  }

  async delete(id) {
    const result = await db.run(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return result.changes;
  }

  now() {
    return new Date().toISOString();
  }
}

module.exports = { BaseRepository, makeId };
