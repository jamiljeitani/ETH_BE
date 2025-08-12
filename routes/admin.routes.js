// routes/admin.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { validate } = require('../middlewares/validate.middleware');
const adminSchema = require('../validators/admin.schema');
const reportSchema = require('../validators/reports.schema');

// Languages
router.get('/languages', ctrl.listLanguages);
router.post('/languages', validate(adminSchema.createLanguage), ctrl.createLanguage);
router.put('/languages/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateLanguage), ctrl.updateLanguage);
router.delete('/languages/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteLanguage);

// Subjects
router.get('/subjects', ctrl.listSubjects);
router.post('/subjects', validate(adminSchema.createSubject), ctrl.createSubject);
router.put('/subjects/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateSubject), ctrl.updateSubject);
router.delete('/subjects/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteSubject);

// Grades
router.get('/grades', ctrl.listGrades);
router.post('/grades', validate(adminSchema.createGrade), ctrl.createGrade);
router.put('/grades/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateGrade), ctrl.updateGrade);
router.delete('/grades/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteGrade);

// Bac Types
router.get('/bac-types', ctrl.listBacTypes);
router.post('/bac-types', validate(adminSchema.createBacType), ctrl.createBacType);
router.put('/bac-types/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateBacType), ctrl.updateBacType);
router.delete('/bac-types/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteBacType);

// Tutor Ranks
router.get('/tutor-ranks', ctrl.listTutorRanks);
router.post('/tutor-ranks', validate(adminSchema.createTutorRank), ctrl.createTutorRank);
router.put('/tutor-ranks/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateTutorRank), ctrl.updateTutorRank);
router.delete('/tutor-ranks/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteTutorRank);

// Sessions (SessionType)
router.get('/sessions', ctrl.listSessions);
router.post('/sessions', validate(adminSchema.createSessionType), ctrl.createSession);
router.put('/sessions/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateSessionType), ctrl.updateSession);
router.delete('/sessions/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteSession);

// Bundles
router.get('/bundles', ctrl.listBundles);
router.post('/bundles', validate(adminSchema.createBundle), ctrl.createBundle);
router.put('/bundles/:id', validate(adminSchema.idParam, 'params'), validate(adminSchema.updateBundle), ctrl.updateBundle);
router.delete('/bundles/:id', validate(adminSchema.idParam, 'params'), ctrl.deleteBundle);

// Assignments
router.get('/assignments', validate(adminSchema.queryAssignments, 'query'), ctrl.listAssignments);
router.post('/assignments', validate(adminSchema.createAssignment), ctrl.createAssignment);

// Tutor change requests
router.get('/tutor-change-requests', ctrl.listChangeRequests);
router.patch('/tutor-change-requests/:id',
  validate(adminSchema.idParamChangeReq, 'params'),
  validate(adminSchema.decisionChangeRequest),
  ctrl.decideChangeRequest
);

// Feedback (admin-only visibility)
router.get('/feedback', validate(adminSchema.feedbackListQuery, 'query'), ctrl.listFeedback);

// Reports
router.get('/reports/consumption', validate(reportSchema.consumptionQuery, 'query'), ctrl.reportConsumption);
router.get('/reports/payouts', validate(reportSchema.payoutsQuery, 'query'), ctrl.reportPayouts);

module.exports = router;
