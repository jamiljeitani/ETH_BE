// routes/support.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/support.controller');
const { authGuard } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// all support routes require auth
router.use(authGuard);

// students & tutors can create/view their own
router.post('/contact', requireRole('student', 'tutor'), ctrl.create);
router.get('/my', requireRole('student', 'tutor', 'admin'), ctrl.mine);

module.exports = router;
