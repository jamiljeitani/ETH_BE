// routes/index.js
const router = require('express').Router();
const { authGuard } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// Auth (from Phase 1)
router.use('/auth', require('./auth.routes'));

// Public lookups
router.use('/lookups', require('./lookups.routes'));

// Admin-only CRUD
router.use('/admin', authGuard, requireRole('admin'), require('./admin.routes'));

// Phase 3: role-guarded profile routes
router.use('/students', authGuard, requireRole('student'), require('./students.routes'));
router.use('/tutors', authGuard, requireRole('tutor'), require('./tutors.routes'));

// Phase 4
router.use('/purchases', authGuard, requireRole('student'), require('./purchases.routes'));
router.use('/payments', authGuard, requireRole('student'), require('./payments.routes'));

// Phase 6
router.use('/calendar', authGuard, require('./calendar.routes'));

// Phase 7
router.use('/sessions', authGuard, requireRole('tutor'), require('./sessions.routes')); // timer endpoints are tutor-only
router.use('/feedback', authGuard, require('./feedback.routes')); // both roles can POST

// Support messages
router.use('/support', require('./support.routes'));

// Email service
router.use('/email', require('./email.routes'));

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
