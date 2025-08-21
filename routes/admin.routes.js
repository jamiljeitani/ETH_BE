// routes/admin.routes.js
const router = require('express').Router();

const ctrl = require('../controllers/admin.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');

// Defensive schema loads (they might not export everything yet)
let adminSchema = {};
let reportSchema = {};
try { adminSchema = require('../validators/admin.schema'); } catch { adminSchema = {}; }
try { reportSchema = require('../validators/reports.schema'); } catch { reportSchema = {}; }

// No-op validator if schema is missing
const safeValidate = (schema, location = 'body') =>
  schema ? validate(schema, location) : (req, res, next) => next();

// Ensure a controller exists; otherwise return 501 (prevents Express crash)
const ensureCtrl = (name) =>
  (typeof ctrl?.[name] === 'function')
    ? ctrl[name]
    : (req, res) => res.status(501).json({
        error: { code: 'NOT_IMPLEMENTED', message: `Admin controller '${name}' not implemented` }
      });

// Protect ALL admin routes
router.use(authMiddleware, requireRole('admin'));

// ---------- Languages ----------
router.get('/languages', ensureCtrl('listLanguages'));
router.post('/languages', safeValidate(adminSchema.createLanguage), ensureCtrl('createLanguage'));
router.put('/languages/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateLanguage),
  ensureCtrl('updateLanguage')
);
router.delete('/languages/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteLanguage')
);

// ---------- Subjects ----------
router.get('/subjects', ensureCtrl('listSubjects'));
router.post('/subjects', safeValidate(adminSchema.createSubject), ensureCtrl('createSubject'));
router.put('/subjects/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateSubject),
  ensureCtrl('updateSubject')
);
router.delete('/subjects/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteSubject')
);

// ---------- Grades ----------
router.get('/grades', ensureCtrl('listGrades'));
router.post('/grades', safeValidate(adminSchema.createGrade), ensureCtrl('createGrade'));
router.put('/grades/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateGrade),
  ensureCtrl('updateGrade')
);
router.delete('/grades/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteGrade')
);

// ---------- Bac Types ----------
router.get('/bac-types', ensureCtrl('listBacTypes'));
router.post('/bac-types', safeValidate(adminSchema.createBacType), ensureCtrl('createBacType'));
router.put('/bac-types/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateBacType),
  ensureCtrl('updateBacType')
);
router.delete('/bac-types/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteBacType')
);

// ---------- Tutor Ranks ----------
router.get('/tutor-ranks', ensureCtrl('listTutorRanks'));
router.post('/tutor-ranks', safeValidate(adminSchema.createTutorRank), ensureCtrl('createTutorRank'));
router.put('/tutor-ranks/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateTutorRank),
  ensureCtrl('updateTutorRank')
);
router.delete('/tutor-ranks/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteTutorRank')
);

// ---------- Sessions (SessionType) ----------
router.get('/sessions', ensureCtrl('listSessions'));
router.post('/sessions', safeValidate(adminSchema.createSessionType), ensureCtrl('createSession'));
router.put('/sessions/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateSessionType),
  ensureCtrl('updateSession')
);
router.delete('/sessions/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteSession')
);

// ---------- Bundles ----------
router.get('/bundles', ensureCtrl('listBundles'));
router.post('/bundles', safeValidate(adminSchema.createBundle), ensureCtrl('createBundle'));
router.put('/bundles/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateBundle),
  ensureCtrl('updateBundle')
);
router.delete('/bundles/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteBundle')
);

// ---------- Tutor change requests ----------
router.get('/tutor-change-requests', ensureCtrl('listChangeRequests'));
router.patch('/tutor-change-requests/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.decisionChangeRequest),
  ensureCtrl('decideChangeRequest')
);

// ---------- Feedback (admin-only) ----------
router.get('/feedback',
  safeValidate(adminSchema.feedbackListQuery, 'query'),
  ensureCtrl('listFeedback')
);

// ---------- Reports ----------
router.get('/reports/consumption',
  safeValidate(reportSchema.consumptionQuery, 'query'),
  ensureCtrl('reportConsumption')
);
router.get('/reports/payouts',
  safeValidate(reportSchema.payoutsQuery, 'query'),
  ensureCtrl('reportPayouts')
);

// ---------- Users & Purchases (Assignments screen support) ----------
router.get('/users', ensureCtrl('listUsers'));
router.get('/students/:id/purchases',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('listStudentPurchases')
);

// ---------- Assignments ----------
router.get('/assignments', ensureCtrl('getAssignments'));
router.post('/assignments',
  safeValidate(adminSchema.createAssignment),
  ensureCtrl('createAssignment')
);
router.put('/assignments/:id',
  safeValidate(adminSchema.idParam, 'params'),
  safeValidate(adminSchema.updateAssignment),
  ensureCtrl('updateAssignment')
);
router.delete('/assignments/:id',
  safeValidate(adminSchema.idParam, 'params'),
  ensureCtrl('deleteAssignment')
);

module.exports = router;
