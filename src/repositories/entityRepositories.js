const { BaseRepository } = require('./base');

class AdminRepository extends BaseRepository {
  constructor() { super('admins', 'a'); }

  async findByUsername(username) {
    return this.findBy('username', username);
  }
}

class EventRepository extends BaseRepository {
  constructor() { super('event_submissions', 'e'); }

  async createSubmission(data) {
    const id = this.makeId();
    await this.insert({
      id,
      name: data.name,
      email: String(data.email).toLowerCase(),
      org: data.org, phone: data.phone, wechat: data.wechat,
      date: data.date, slot: data.slot, interest: data.interest,
      agreed: data.agreed ? 1 : 0,
      submittedAt: this.now()
    });
    return { id, name: data.name, email: String(data.email).toLowerCase() };
  }

  async searchSubmissions({ search = '', page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const where = search ? 'WHERE name LIKE ? OR email LIKE ? OR org LIKE ?' : '';
    const term = `%${search}%`;
    const params = search ? [term, term, term] : [];
    const [rows, total] = await Promise.all([
      this.findAll({ where, params, orderBy: 'submittedAt DESC', limit, offset }),
      this.count(where, params)
    ]);
    return { submissions: rows, total, page, limit };
  }

  async stats() {
    const [total, today, daily] = await Promise.all([
      this.count(),
      this.count("date(submittedAt) = date('now')"),
      this.findAll({
        where: '1=1',
        orderBy: 'date DESC',
        limit: 7,
        // raw select override not supported by base, so we query directly
        _raw: true
      })
    ]);
    // Override: get daily breakdown directly
    const db = require('./database').getInstance();
    const dailyRows = await db.all(
      'SELECT date, COUNT(*) as count FROM event_submissions GROUP BY date ORDER BY date DESC LIMIT 7'
    );
    return { total, today, daily: dailyRows };
  }
}

class NewsRepository extends BaseRepository {
  constructor() { super('news', 'n'); }

  async createArticle({ title, content, date }) {
    const id = this.makeId();
    await this.insert({ id, title, content: content || '', date, created_at: this.now() });
    return { id, title, content, date };
  }

  async listRecent(limit = 50) {
    return this.findAll({ orderBy: 'date DESC', limit });
  }
}

module.exports = { AdminRepository, EventRepository, NewsRepository };
