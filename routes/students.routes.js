// routes/students.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/students.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/student.schema');

router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

// Tutor change requests (student)
router.post('/tutor-change-requests', validate(schema.createTutorChangeRequest), ctrl.createTutorChangeRequest);
router.get('/tutor-change-requests', ctrl.listMyTutorChangeRequests);

module.exports = router;
