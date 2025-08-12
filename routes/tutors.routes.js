// routes/tutors.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/tutors.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/tutor.schema');

router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

module.exports = router;
