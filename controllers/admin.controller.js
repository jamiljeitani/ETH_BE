// controllers/admin.controller.js
const admin = require('../services/admin.service');
const assignSvc = require('../services/assignment.service');
const changeSvc = require('../services/change-request.service');
const feedbackSvc = require('../services/feedback.service');
const reportsSvc = require('../services/reports.service');

// ---- Manual payments (admin) ----
const paymentSvc = require('../services/payment.service');

async function listManualPayments(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await paymentSvc.listManualReviewTransactions({ page, limit });
    res.json(result);
  } catch (e) { next(e); }
}

async function approveManualPayment(req, res, next) {
  try {
    const { transactionId } = req.params;
    const result = await paymentSvc.approveManualTransaction(req.user.id, transactionId, req.body);
    res.json(result);
  } catch (e) { next(e); }
}

async function rejectManualPayment(req, res, next) {
  try {
    const { transactionId } = req.params;
    const result = await paymentSvc.rejectManualTransaction(req.user.id, transactionId, req.body);
    res.json(result);
  } catch (e) { next(e); }
}


const { User, Purchase, SessionType, Bundle, StudentProfile, TutorProfile, BacType, Subject } = require('../models');

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
const listUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: ["id", "email", "role", "createdAt"],
      include: [
        {
          model: StudentProfile,
          as: 'studentProfile',
          attributes: ['fullName', 'guardianName', 'school'],
          required: false
        },
        {
          model: TutorProfile,
          as: 'tutorProfile',
          attributes: ['fullName', 'educationLevel'],
          required: false
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Format users with display names
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      displayName: user.role === 'student'
        ? (user.studentProfile?.fullName || user.email)
        : user.role === 'tutor'
        ? (user.tutorProfile?.fullName || user.email)
        : user.email,
      profileInfo: user.role === 'student'
        ? user.studentProfile?.school
        : user.role === 'tutor'
        ? user.tutorProfile?.educationLevel
        : null
    }));

    res.json({ users: formattedUsers });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/students/:id/purchases
const listStudentPurchases = async (req, res, next) => {
  try {
    const { id: studentId } = req.params;

    const purchases = await Purchase.findAll({
      where: { studentId },
      include: [
        { model: SessionType, as: "sessionType", attributes: ["id", "name", "hourlyRate"] },
        { model: Bundle, as: "bundle", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ purchases });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000));

    // Get total counts
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalTutors = await User.count({ where: { role: 'tutor' } });
    const totalSessions = await SessionType.count();

    // Get new registrations in last 20 days
    const newStudents = await User.count({
      where: {
        role: 'student',
        createdAt: { [Op.gte]: twentyDaysAgo }
      }
    });

    const newTutors = await User.count({
      where: {
        role: 'tutor',
        createdAt: { [Op.gte]: twentyDaysAgo }
      }
    });

    // Calculate percentage increases (mock calculation for now)
    const studentIncrease = totalStudents > 0 ? Math.round((newStudents / totalStudents) * 100) : 0;
    const tutorIncrease = totalTutors > 0 ? Math.round((newTutors / totalTutors) * 100) : 0;

    res.json({
      stats: {
        totalStudents,
        totalTutors,
        totalSessions,
        newStudents,
        newTutors,
        studentIncrease,
        tutorIncrease,
        sessionIncrease: 60 // Mock value for now
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/dashboard/recent-students
const getRecentStudents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const students = await User.findAll({
      where: { role: 'student' },
      include: [{
        model: StudentProfile,
        as: 'studentProfile',
        attributes: ['fullName', 'guardianName', 'school'],
        include: [{
          model: BacType,
          as: 'bacTypes',
          attributes: ['name'],
          through: { attributes: [] }
        }]
      }],
      attributes: ['id', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit
    });

    const formattedStudents = students.map((student, index) => ({
      no: String(index + 1).padStart(2, '0'),
      name: student.studentProfile?.fullName || student.email,
      guardian: student.studentProfile?.guardianName || 'N/A',
      date: student.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      bac: student.studentProfile?.bacTypes?.[0]?.name || 'N/A',
      id: student.id
    }));

    res.json({ students: formattedStudents });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/dashboard/recent-tutors
const getRecentTutors = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const tutors = await User.findAll({
      where: { role: 'tutor' },
      include: [{
        model: TutorProfile,
        as: 'tutorProfile',
        attributes: ['fullName', 'educationLevel'],
        include: [{
          model: Subject,
          as: 'subjects',
          attributes: ['name'],
          through: { attributes: [] }
        }]
      }],
      attributes: ['id', 'email', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit
    });

    const formattedTutors = tutors.map((tutor, index) => ({
      no: String(index + 1).padStart(2, '0'),
      name: tutor.tutorProfile?.fullName || tutor.email,
      teach: tutor.tutorProfile?.subjects?.map(s => s.name).join(', ') || 'N/A',
      date: tutor.createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      cert: tutor.tutorProfile?.educationLevel || 'N/A',
      id: tutor.id
    }));

    res.json({ tutors: formattedTutors });
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
  reportPayouts,
  listUsers,
  listStudentPurchases,
  // Dashboard endpoints
  getDashboardStats,
  getRecentStudents,
  getRecentTutors,
  listManualPayments,
  approveManualPayment,
  rejectManualPayment
};
