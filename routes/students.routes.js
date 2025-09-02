// routes/students.routes.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/students.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/student.schema');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

// Avatar upload endpoint
router.post('/me/avatar', upload.single('file'), ctrl.uploadAvatar);

// Tutor change requests (student)
router.post('/tutor-change-requests', validate(schema.createTutorChangeRequest), ctrl.createTutorChangeRequest);
router.get('/tutor-change-requests', ctrl.listMyTutorChangeRequests);

module.exports = router;
