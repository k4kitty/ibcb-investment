/**
 * Reusable validation utilities.
 * Strategy Pattern: each validator is a pure function —
 * callers compose them as needed without inheritance.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns { valid: boolean, errors: [{ field, message }] } */
const validate = (...checks) => {
  const errors = [];
  for (const check of checks) {
    const result = check();
    if (result) errors.push(result);
  }
  return { valid: errors.length === 0, errors };
};

/** Required field check */
const required = (value, field, message) => () => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { field, message: message || `${field}為必填欄位` };
  }
  return null;
};

/** Email format check */
const email = (value, field) => () => {
  if (value && !EMAIL_RE.test(String(value))) {
    return { field, message: '電郵格式不正確' };
  }
  return null;
};

/** Duplicate email check (async) */
const uniqueEmail = (repo, email, excludeId) => async () => {
  if (!email) return null;
  const existing = await repo.findByEmail(email);
  if (existing && existing.id !== excludeId) {
    return { field: 'email', message: '此電郵已登記，請直接登入或使用其他電郵' };
  }
  return null;
};

module.exports = { validate, required, email, uniqueEmail };
