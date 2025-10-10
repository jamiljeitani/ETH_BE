// routes/tutors.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/tutors.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/tutor.schema');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { uploadMemory } = require('../lib/multerUpload');

// 🔐 Protect all tutor endpoints
router.use(authMiddleware, requireRole('tutor'));

router.get('/me', ctrl.getMe);
router.put('/me', validate(schema.putMe), ctrl.putMe);

/** Assigned students (unique list) */
router.get('/me/assigned-students', ctrl.listAssignedStudents);

/** Assignments list (student + purchase) */
router.get('/me/assignments', ctrl.listMyAssignments);

/** Wallet */
router.get('/me/wallet', ctrl.getMyWallet);
router.get('/me/wallet/transactions', ctrl.getMyWalletTransactions);
router.get('/me/withdrawals', ctrl.listMyWithdrawals);
router.post('/me/withdrawals', ctrl.createWithdrawRequest);

/** Purchases assigned to me (for recurrence limits) */
router.get('/me/assigned-purchases', ctrl.listAssignedPurchases);

/** File uploads (memory -> ImageKit) */
router.post('/me/avatar', uploadMemory.single('file'), ctrl.uploadAvatar);
router.post('/me/id-document', uploadMemory.single('idDocument'), ctrl.uploadIdDocument);

module.exports = router;
