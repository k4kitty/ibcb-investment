const { Router } = require('express');
const { requireAuth } = require('../middleware/middleware');
const { MemberService } = require('../services/services');
const { memberExporter } = require('../utils/csv');
const memberService = new MemberService();

const router = Router();

// List
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await memberService.list(req.query);
    res.json(result);
  } catch (e) { next(e); }
});

// Stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await memberService.stats();
    res.json(result);
  } catch (e) { next(e); }
});

// Create (public registration — no auth required)
router.post('/', async (req, res, next) => {
  try {
    const result = await memberService.create(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (e) { next(e); }
});

// Update
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await memberService.update(req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
});

// Delete
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await memberService.delete(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
});

// Export CSV
router.get('/export/csv', requireAuth, async (req, res, next) => {
  try {
    const rows = await memberService.exportCsv();
    const csv = memberExporter.generate(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

module.exports = router;
