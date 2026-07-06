const MemberRepository = require('../repositories/memberRepository');
const { EventRepository, NewsRepository, AdminRepository } = require('../repositories/entityRepositories');
const { validate, required, email, uniqueEmail } = require('../validators/validators');

/**
 * MemberService — orchestrates member CRUD with validation.
 * Single Responsibility: all member business logic lives here.
 */
class MemberService {
  constructor(repo = new MemberRepository()) {
    this.repo = repo;
  }

  async list(query) {
    return this.repo.searchMembers(query);
  }

  async stats() {
    return this.repo.stats();
  }

  async create(data) {
    const { valid, errors } = validate(
      required(data.name, 'name', '請填寫姓名'),
      required(data.email, 'email', '請填寫電郵'),
      required(data.country, 'country', '請填寫國家/地區'),
      required(data.city, 'city', '請填寫城市'),
      email(data.email, 'email')
    );
    if (!valid) throw Object.assign(new Error('驗證失敗'), { status: 400, errors });

    const dup = await uniqueEmail(this.repo, data.email)();
    if (dup) throw Object.assign(new Error(dup.message), { status: 409, errors: [dup] });

    return this.repo.createMember(data);
  }

  async update(id, data) {
    const { valid, errors } = validate(
      required(data.name, 'name', '請填寫姓名'),
      required(data.email, 'email', '請填寫電郵'),
      required(data.country, 'country', '請填寫國家/地區'),
      required(data.city, 'city', '請填寫城市'),
      email(data.email, 'email')
    );
    if (!valid) throw Object.assign(new Error('驗證失敗'), { status: 400, errors });

    const dup = await uniqueEmail(this.repo, data.email, id)();
    if (dup) throw Object.assign(new Error(dup.message), { status: 409, errors: [dup] });

    const changes = await this.repo.updateMember(id, data);
    if (changes === 0) throw Object.assign(new Error('找不到該會員'), { status: 404 });
    return { success: true };
  }

  async delete(id) {
    const changes = await this.repo.delete(id);
    if (changes === 0) throw Object.assign(new Error('找不到該會員'), { status: 404 });
    return { success: true };
  }

  async exportCsv() {
    const rows = await this.repo.findAll({ orderBy: 'registeredAt DESC' });
    return rows;
  }
}

/**
 * EventService
 */
class EventService {
  constructor(repo = new EventRepository()) {
    this.repo = repo;
  }

  async list(query) {
    return this.repo.searchSubmissions(query);
  }

  async stats() {
    return this.repo.stats();
  }

  async create(data) {
    const { valid, errors } = validate(
      required(data.name, 'name', '請填寫姓名'),
      required(data.email, 'email', '請填寫電郵'),
      required(data.date, 'date', '請選擇日期'),
      required(data.slot, 'slot', '請選擇時段'),
      email(data.email, 'email')
    );
    if (!valid) throw Object.assign(new Error('驗證失敗'), { status: 400, errors });
    return this.repo.createSubmission(data);
  }
}

/**
 * NewsService
 */
class NewsService {
  constructor(repo = new NewsRepository()) {
    this.repo = repo;
  }

  async listRecent() {
    return this.repo.listRecent();
  }

  async create(data) {
    const { valid, errors } = validate(
      required(data.title, 'title', '請填寫標題'),
      required(data.date, 'date', '請填寫日期')
    );
    if (!valid) throw Object.assign(new Error('驗證失敗'), { status: 400, errors });
    return this.repo.createArticle(data);
  }

  async delete(id) {
    const changes = await this.repo.delete(id);
    if (changes === 0) throw Object.assign(new Error('找不到該文章'), { status: 404 });
    return { success: true };
  }
}

/**
 * AuthService
 */
class AuthService {
  constructor(repo = new AdminRepository()) {
    this.repo = repo;
  }

  async login(username, password) {
    if (!username || !password) {
      throw Object.assign(new Error('請輸入帳號和密碼'), { status: 400 });
    }
    const admin = await this.repo.findByUsername(username);
    if (!admin || password !== admin.password) {
      throw Object.assign(new Error('帳號或密碼錯誤'), { status: 401 });
    }
    return { id: admin.id, username: admin.username };
  }
}

module.exports = { MemberService, EventService, NewsService, AuthService };
