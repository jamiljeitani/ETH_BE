// routes/tutors.routes.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/tutors.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/tutor.schema');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// 🔐 Protect all tutor endpoints
router.use(authMiddleware, requireRole('tutor'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'file') cb(null, 'uploads/avatars/');
    else if (file.fieldname === 'idDocument') cb(null, 'uploads/documents/');
    else cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === 'idDocument' ? 'tutor-id-' : 'tutor-';
    cb(null, prefix + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'file' && file.mimetype.startsWith('image/')) cb(null, true);
    else if (file.fieldname === 'idDocument' && (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf')) cb(null, true);
    else cb(new Error('Invalid file type!'), false);
  }
});

/** Profile (self) */
router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

/** NEW: Assigned students list for the tutor */
router.get('/me/assigned-students', ctrl.listAssignedStudents);

/** File uploads */
router.post('/me/avatar', upload.single('file'), ctrl.uploadAvatar);
router.post('/me/id-document', upload.single('idDocument'), ctrl.uploadIdDocument);

module.exports = router;
