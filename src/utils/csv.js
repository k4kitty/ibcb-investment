/**
 * CSV export utility — extracts CSV logic from route handlers.
 */
class CsvExporter {
  /**
   * @param {Array<{header: string, key: string}>} columns
   */
  constructor(columns) {
    this.columns = columns;
  }

  escape(value) {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  generate(rows) {
    const header = this.columns.map(c => c.header).join(',');
    const lines = rows.map(row =>
      this.columns.map(c => this.escape(row[c.key])).join(',')
    );
    return '\uFEFF' + header + '\n' + lines.join('\n');
  }
}

// Pre-configured exporters
const memberExporter = new CsvExporter([
  { header: '姓名', key: 'name' },
  { header: '機構', key: 'org' },
  { header: '職位', key: 'title' },
  { header: '電郵', key: 'email' },
  { header: '電話', key: 'phone' },
  { header: '微信', key: 'wechat' },
  { header: '國家', key: 'country' },
  { header: '城市', key: 'city' },
  { header: '興趣', key: 'interest' },
  { header: '登記時間', key: 'registeredAt' }
]);

const eventExporter = new CsvExporter([
  { header: '姓名', key: 'name' },
  { header: '機構', key: 'org' },
  { header: '電郵', key: 'email' },
  { header: '電話', key: 'phone' },
  { header: '微信', key: 'wechat' },
  { header: '日期', key: 'date' },
  { header: '時段', key: 'slot' },
  { header: '興趣', key: 'interest' },
  { header: '提交時間', key: 'submittedAt' }
]);

module.exports = { CsvExporter, memberExporter, eventExporter };
