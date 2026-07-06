const { BaseRepository } = require('./base');

/**
 * MemberRepository — encapsulates all member DB operations.
 * @extends BaseRepository
 */
class MemberRepository extends BaseRepository {
  constructor() {
    super('members', 'm');
  }

  /** Override insert to add defaults */
  async createMember({ name, email, org, title, role, phone, wechat, country, city, interest }) {
    const id = this.makeId();
    const now = this.now();
    await this.insert({
      id, name,
      email: String(email).toLowerCase(),
      org, title, role, phone, wechat,
      country, city, interest,
      status: 'active',
      registeredAt: now,
      updatedAt: now
    });
    return { id, name, email: String(email).toLowerCase() };
  }

  /** Paginated search */
  async searchMembers({ search = '', page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const where = search
      ? 'WHERE name LIKE ? OR email LIKE ? OR org LIKE ?'
      : '';
    const term = `%${search}%`;
    const params = search ? [term, term, term] : [];

    const [rows, total] = await Promise.all([
      this.findAll({ where, params, orderBy: 'registeredAt DESC', limit, offset }),
      this.count(where, params)
    ]);
    return { members: rows, total, page, limit };
  }

  /** Update member fields */
  async updateMember(id, fields) {
    const allowed = ['name', 'email', 'org', 'title', 'role', 'phone', 'wechat', 'country', 'city', 'interest', 'status'];
    const data = {};
    for (const k of allowed) {
      if (fields[k] !== undefined) data[k] = k === 'email' ? String(fields[k]).toLowerCase() : fields[k];
    }
    data.updatedAt = this.now();
    return this.update(id, data);
  }

  /** Stats: total + today */
  async stats() {
    const [total, today] = await Promise.all([
      this.count(),
      this.count("date(registeredAt) = date('now')")
    ]);
    return { total, today };
  }

  async findByEmail(email) {
    return this.findBy('email', String(email).toLowerCase());
  }
}

module.exports = MemberRepository;
