// routes/auth.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const schema = require('../validators/auth.schema');
const { validate } = require('../middlewares/validate.middleware');
const { authGuard } = require('../middlewares/auth.middleware');

router.post('/signup', validate(schema.signup), ctrl.signup);
router.get('/verify-email', validate(schema.verifyEmail), ctrl.verifyEmail);
router.post('/login', validate(schema.login), ctrl.login);
router.post('/refresh', validate(schema.refresh), ctrl.refresh);
router.post('/forgot', validate(schema.forgot), ctrl.forgot);
router.post('/reset', validate(schema.reset), ctrl.reset);
router.get('/me', authGuard, ctrl.me);
router.get('/preferences', authGuard, ctrl.getPreferences);
router.put('/preferences', authGuard, validate(schema.updatePreferences), ctrl.updatePreferences);

module.exports = router;
