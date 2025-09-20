// routes/students.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/students.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/student.schema');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { uploadMemory } = require('../lib/multerUpload');

// Protect student routes
router.use(authMiddleware, requireRole('student'));

router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

// Avatar upload endpoint (memory upload -> ImageKit)
router.post('/me/avatar', uploadMemory.single('file'), ctrl.uploadAvatar);

// Tutor change requests (student)
router.post('/tutor-change-requests', validate(schema.createTutorChangeRequest), ctrl.createTutorChangeRequest);
router.get('/tutor-change-requests', ctrl.listMyTutorChangeRequests);

module.exports = router;
