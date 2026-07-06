/**
 * Centralized error handler middleware.
 * Maps service-layer errors to HTTP responses.
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const payload = { error: err.message || '伺服器錯誤' };
  if (err.errors) payload.errors = err.errors;
  if (status === 500) console.error('[ERROR]', err);
  res.status(status).json(payload);
}

/** Simple auth middleware — session-based */
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { errorHandler, requireAuth };
