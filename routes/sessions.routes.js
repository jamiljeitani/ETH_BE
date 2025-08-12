// routes/sessions.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/sessions.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/session.schema');

// Tutor-only actions
router.post('/start', validate(schema.start), ctrl.start);
router.post('/:id/pause', validate(schema.idParam, 'params'), ctrl.pause);
router.post('/:id/resume', validate(schema.idParam, 'params'), ctrl.resume);
router.post('/:id/end', validate(schema.idParam, 'params'), ctrl.end);

// Both student/tutor can view details
router.get('/:id', validate(schema.idParam, 'params'), ctrl.getOne);

module.exports = router;
