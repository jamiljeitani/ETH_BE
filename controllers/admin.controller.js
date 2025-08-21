// controllers/admin.controller.js
const admin = require('../services/admin.service');
const assignSvc = require('../services/assignment.service');
const changeSvc = require('../services/change-request.service');
const feedbackSvc = require('../services/feedback.service');
const reportsSvc = require('../services/reports.service');

// Languages
const listLanguages = (req, res, next) => admin.language.list().then(d => res.json(d)).catch(next);
const createLanguage = (req, res, next) => admin.language.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateLanguage = (req, res, next) => admin.language.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteLanguage = (req, res, next) => admin.language.remove(req.params.id).then(d => res.json(d)).catch(next);

// Subjects
const listSubjects = (req, res, next) => admin.subject.list().then(d => res.json(d)).catch(next);
const createSubject = (req, res, next) => admin.subject.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateSubject = (req, res, next) => admin.subject.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteSubject = (req, res, next) => admin.subject.remove(req.params.id).then(d => res.json(d)).catch(next);

// Grades
const listGrades = (req, res, next) => admin.grade.list().then(d => res.json(d)).catch(next);
const createGrade = (req, res, next) => admin.grade.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateGrade = (req, res, next) => admin.grade.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteGrade = (req, res, next) => admin.grade.remove(req.params.id).then(d => res.json(d)).catch(next);

// Bac Types
const listBacTypes = (req, res, next) => admin.bacType.list().then(d => res.json(d)).catch(next);
const createBacType = (req, res, next) => admin.bacType.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateBacType = (req, res, next) => admin.bacType.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteBacType = (req, res, next) => admin.bacType.remove(req.params.id).then(d => res.json(d)).catch(next);

// Tutor Ranks
const listTutorRanks = (req, res, next) => admin.tutorRank.list().then(d => res.json(d)).catch(next);
const createTutorRank = (req, res, next) => admin.tutorRank.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateTutorRank = (req, res, next) => admin.tutorRank.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteTutorRank = (req, res, next) => admin.tutorRank.remove(req.params.id).then(d => res.json(d)).catch(next);

// Session Types (exposed as "sessions")
const listSessions = (req, res, next) => admin.sessionType.list().then(d => res.json(d)).catch(next);
const createSession = (req, res, next) => admin.sessionType.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateSession = (req, res, next) => admin.sessionType.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteSession = (req, res, next) => admin.sessionType.remove(req.params.id).then(d => res.json(d)).catch(next);

// Bundles
const listBundles = (req, res, next) => admin.listBundles().then(d => res.json(d)).catch(next);
const createBundle = (req, res, next) => admin.createBundle(req.body).then(d => res.status(201).json(d)).catch(next);
const updateBundle = (req, res, next) => admin.updateBundle(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteBundle = (req, res, next) => admin.removeBundle(req.params.id).then(d => res.json(d)).catch(next);

// Assignments
const listAssignments = async (req, res, next) => {
  try { const data = await assignSvc.listAssignments(req.query || {}); res.json(data); }
  catch (e) { next(e); }
};
const createAssignment = async (req, res, next) => {
  try {
    const data = await assignSvc.createOrReplaceAssignment(req.user.id, req.body);
    res.status(201).json(data);
  } catch (e) { next(e); }
};

// Change Requests (admin)
const listChangeRequests = async (req, res, next) => {
  try {
    const data = await changeSvc.listAll(req.query.status);
    res.json(data);
  } catch (e) { next(e); }
};
const decideChangeRequest = async (req, res, next) => {
  try {
    const data = await changeSvc.decide(req.user.id, req.params.id, req.body);
    res.json(data);
  } catch (e) { next(e); }
};

// Feedback (admin-only visibility)
const listFeedback = async (req, res, next) => {
  try {
    const data = await feedbackSvc.listForAdmin(req.query || {});
    res.json({ feedback: data });
  } catch (e) { next(e); }
};

// Reports
const reportConsumption = async (req, res, next) => {
  try {
    const data = await reportsSvc.getConsumptionReport(req.query || {});
    res.json(data);
  } catch (e) { next(e); }
};
const reportPayouts = async (req, res, next) => {
  try {
    const data = await reportsSvc.getPayoutsReport(req.query || {});
    res.json(data);
  } catch (e) { next(e); }
};

// GET /api/v1/admin/users?role=student|tutor|admin (role optional)
exports.listUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role; // IMPORTANT: don't Object.assign with a non-object

    const users = await User.findAll({
      where,
      attributes: ["id", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/students/:id/purchases
exports.listStudentPurchases = async (req, res, next) => {
  try {
    const { id: studentId } = req.params;

    const purchases = await Purchase.findAll({
      where: { studentId },
      include: [
        { model: SessionType, as: "sessionType", attributes: ["id", "name", "hourlyRate"] },
        { model: Bundle, as: "bundle", attributes: ["id", "name", "price"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ purchases });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listLanguages, createLanguage, updateLanguage, deleteLanguage,
  listSubjects, createSubject, updateSubject, deleteSubject,
  listGrades, createGrade, updateGrade, deleteGrade,
  listBacTypes, createBacType, updateBacType, deleteBacType,
  listTutorRanks, createTutorRank, updateTutorRank, deleteTutorRank,
  listSessions, createSession, updateSession, deleteSession,
  listBundles, createBundle, updateBundle, deleteBundle,
  listAssignments,
  createAssignment,
  listChangeRequests,
  decideChangeRequest,
  listFeedback,
  reportConsumption,
  reportPayouts
};
