// controllers/admin.controller.js
const { Op } = require("sequelize");
const admin = require("../services/admin.service");
const assignSvc = require("../services/assignment.service");
const changeSvc = require("../services/change-request.service");
const feedbackSvc = require("../services/feedback.service");
const reportsSvc = require("../services/reports.service");
const paymentSvc = require("../services/payment.service");

const {
  sequelize,
  User,
  StudentProfile,
  TutorProfile,
  Language,
  Subject,
  Grade,
  BacType,
  TutorRank,
  Purchase,
  SessionType,
  Bundle,
} = require("../models");

/* ----------------------- Helpers ------------------------ */
function rangeWhere(from, to) {
  if (!from && !to) return {};
  const w = {};
  if (from) w[Op.gte] = new Date(from);
  if (to) w[Op.lt] = new Date(to);
  return { createdAt: w };
}

/* ----------------------- Manual payments (admin) ------------------------ */
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

/* ----------------------- Lookups ------------------------ */
const listLanguages = (req, res, next) => admin.language.list().then(d => res.json(d)).catch(next);
const createLanguage = (req, res, next) => admin.language.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateLanguage = (req, res, next) => admin.language.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteLanguage = (req, res, next) => admin.language.remove(req.params.id).then(d => res.json(d)).catch(next);

const listSubjects = (req, res, next) => admin.subject.list().then(d => res.json(d)).catch(next);
const createSubject = (req, res, next) => admin.subject.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateSubject = (req, res, next) => admin.subject.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteSubject = (req, res, next) => admin.subject.remove(req.params.id).then(d => res.json(d)).catch(next);

const listGrades = (req, res, next) => admin.grade.list().then(d => res.json(d)).catch(next);
const createGrade = (req, res, next) => admin.grade.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateGrade = (req, res, next) => admin.grade.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteGrade = (req, res, next) => admin.grade.remove(req.params.id).then(d => res.json(d)).catch(next);

const listBacTypes = (req, res, next) => admin.bacType.list().then(d => res.json(d)).catch(next);
const createBacType = (req, res, next) => admin.bacType.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateBacType = (req, res, next) => admin.bacType.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteBacType = (req, res, next) => admin.bacType.remove(req.params.id).then(d => res.json(d)).catch(next);

const listTutorRanks = (req, res, next) => admin.tutorRank.list().then(d => res.json(d)).catch(next);
const createTutorRank = (req, res, next) => admin.tutorRank.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateTutorRank = (req, res, next) => admin.tutorRank.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteTutorRank = (req, res, next) => admin.tutorRank.remove(req.params.id).then(d => res.json(d)).catch(next);

/* ----------------------- Session Types ------------------------ */
const listSessions = (req, res, next) => admin.sessionType.list().then(d => res.json({ sessions: d })).catch(next);
const createSession = (req, res, next) => admin.sessionType.create(req.body).then(d => res.status(201).json(d)).catch(next);
const updateSession = (req, res, next) => admin.sessionType.update(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteSession = (req, res, next) => admin.sessionType.remove(req.params.id).then(d => res.json(d)).catch(next);

/* ----------------------- Bundles ------------------------ */
const listBundles = (req, res, next) => admin.listBundles().then(d => res.json({ bundles: d })).catch(next);
const createBundle = (req, res, next) => admin.createBundle(req.body).then(d => res.status(201).json(d)).catch(next);
const updateBundle = (req, res, next) => admin.updateBundle(req.params.id, req.body).then(d => res.json(d)).catch(next);
const deleteBundle = (req, res, next) => admin.removeBundle(req.params.id).then(d => res.json(d)).catch(next);

/* ----------------------- Assignments ------------------------ */
const listAssignments = async (req, res, next) => {
  try { const data = await assignSvc.listAssignments(req.query || {}); res.json(data); }
  catch (e) { next(e); }
};
const createAssignment = async (req, res, next) => {
  try { const data = await assignSvc.createOrReplaceAssignment(req.user.id, req.body); res.status(201).json(data); }
  catch (e) { next(e); }
};
const updateAssignment = async (req, res, next) => {
  try { const data = await assignSvc.updateAssignment(req.user.id, req.params.id, req.body); res.json(data); }
  catch (e) { next(e); }
};
const deleteAssignment = async (req, res, next) => {
  try { const data = await assignSvc.removeAssignment(req.params.id); res.json(data); }
  catch (e) { next(e); }
};

/* ----------------------- Change Requests ------------------------ */
const listChangeRequests = async (req, res, next) => {
  try { const data = await changeSvc.listAll(req.query.status); res.json(data); }
  catch (e) { next(e); }
};
const decideChangeRequest = async (req, res, next) => {
  try { const data = await changeSvc.decide(req.user.id, req.params.id, req.body); res.json(data); }
  catch (e) { next(e); }
};

/* ----------------------- Feedback ------------------------ */
const listFeedback = async (req, res, next) => {
  try { const data = await feedbackSvc.listForAdmin(req.query || {}); res.json({ feedback: data }); }
  catch (e) { next(e); }
};

/* ----------------------- Reports ------------------------ */
const reportConsumption = async (req, res, next) => {
  try { const data = await reportsSvc.getConsumptionReport(req.query || {}); res.json(data); }
  catch (e) { next(e); }
};
const reportPayouts = async (req, res, next) => {
  try { const data = await reportsSvc.getPayoutsReport(req.query || {}); res.json(data); }
  catch (e) { next(e); }
};

/* ----------------------- Users: list & purchases ------------------------ */
function studentDeepInclude() {
  return [
    {
      model: StudentProfile,
      as: "studentProfile",
      include: [
        { model: Grade, as: "grade", attributes: ["id", "name"] },
        { model: BacType, as: "bacTypes", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Language, as: "languages", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Subject, as: "subjects", attributes: ["id", "name"], through: { attributes: [] } },
      ],
    },
  ];
}
function tutorDeepInclude() {
  return [
    {
      model: TutorProfile,
      as: "tutorProfile",
      include: [
        { model: TutorRank, as: "rank", attributes: ["id", "name", "order"] },
        { model: Language, as: "languages", attributes: ["id", "name"], through: { attributes: [] } },
        { model: Subject, as: "subjects", attributes: ["id", "name"], through: { attributes: [] } },
        { model: BacType, as: "bacTypes", attributes: ["id", "name"], through: { attributes: [] } },
      ],
    },
  ];
}

/** GET /admin/users?role=student|tutor|admin */
const listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const users = await admin.listUsers({ role }); // service does the right include
    res.json({ users });
  } catch (err) {
    console.error("Admin listUsers failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to list users" } });
  }
};

/** GET /admin/users/:id — deep detail for Admin drawer (both roles) */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: [...studentDeepInclude(), ...tutorDeepInclude()],
    });
    if (!user) return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    res.json({ user });
  } catch (err) {
    console.error("Admin getUser failed:", err);
    res.status(500).json({ error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch user" } });
  }
};

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
  } catch (err) { next(err); }
};

/* ----------------------- Dashboard & misc ------------------------ */
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const twentyDays = 20 * 24 * 60 * 60 * 1000;
    const curFrom = new Date(now.getTime() - twentyDays);
    const prevFrom = new Date(now.getTime() - 2 * twentyDays);
    const prevTo = curFrom;

    const [totalStudents, totalTutors, totalSessions] = await Promise.all([
      User.count({ where: { role: "student" } }),
      User.count({ where: { role: "tutor" } }),
      SessionType.count(),
    ]);

    const [currentStudents20d, currentTutors20d, currentSessions20d] = await Promise.all([
      User.count({ where: { role: "student", createdAt: { [Op.gte]: curFrom } } }),
      User.count({ where: { role: "tutor", createdAt: { [Op.gte]: curFrom } } }),
      SessionType.count({ where: { createdAt: { [Op.gte]: curFrom } } }),
    ]);

    const [previousStudents20d, previousTutors20d, previousSessions20d] = await Promise.all([
      User.count({ where: { role: "student", createdAt: { [Op.gte]: prevFrom, [Op.lt]: prevTo } } }),
      User.count({ where: { role: "tutor", createdAt: { [Op.gte]: prevFrom, [Op.lt]: prevTo } } }),
      SessionType.count({ where: { createdAt: { [Op.gte]: prevFrom, [Op.lt]: prevTo } } }),
    ]);

    const pct = (prev, curr) => (prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));

    res.json({
      stats: {
        totalStudents,
        totalTutors,
        totalSessions,
        newStudents: currentStudents20d,
        studentIncrease: pct(previousStudents20d, currentStudents20d),
        tutorIncrease: pct(previousTutors20d, currentTutors20d),
        sessionIncrease: pct(previousSessions20d, currentSessions20d),
      },
    });
  } catch (err) { next(err); }
};

const getRecentStudents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const students = await User.findAll({
      where: { role: "student" },
      include: [{
        model: StudentProfile,
        as: "studentProfile",
        attributes: ["fullName", "guardianName", "school"],
        include: [{
          model: BacType,
          as: "bacTypes",
          attributes: ["name"],
          through: { attributes: [] },
        }],
      }],
      attributes: ["id", "email", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit,
    });

    const formatted = students.map((s, i) => ({
      no: String(i + 1).padStart(2, "0"),
      name: s.studentProfile?.fullName || s.email,
      guardian: s.studentProfile?.guardianName || "N/A",
      date: s.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      bac: s.studentProfile?.bacTypes?.[0]?.name || "N/A",
      id: s.id,
    }));

    res.json({ students: formatted });
  } catch (err) { next(err); }
};

const getRecentTutors = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const tutors = await User.findAll({
      where: { role: "tutor" },
      include: [{
        model: TutorProfile,
        as: "tutorProfile",
        attributes: ["fullName", "educationLevel"],
        include: [{
          model: Subject,
          as: "subjects",
          attributes: ["name"],
          through: { attributes: [] },
        }],
      }],
      attributes: ["id", "email", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit,
    });

    const formatted = tutors.map((t, i) => ({
      no: String(i + 1).padStart(2, "0"),
      name: t.tutorProfile?.fullName || t.email,
      teach: t.tutorProfile?.subjects?.map((x) => x.name).join(", ") || "N/A",
      date: t.createdAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      cert: t.tutorProfile?.educationLevel || "N/A",
      id: t.id,
    }));

    res.json({ tutors: formatted });
  } catch (err) { next(err); }
};

/* ----------------------- Counts & generic user ops ------------------------ */
const countUsers = async (req, res, next) => {
  try { const { role } = req.query; const where = role ? { role } : {}; const total = await User.count({ where }); res.json({ count: total }); }
  catch (e) { next(e); }
};
const countSessions = async (req, res, next) => {
  try { const { from, to } = req.query; const where = rangeWhere(from, to); const count = await SessionType.count({ where }); res.json({ count }); }
  catch (e) { next(e); }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ...rest } = req.body || {};
    const user = await User.findByPk(id, {
      include: [
        { model: StudentProfile, as: "studentProfile" },
        { model: TutorProfile, as: "tutorProfile" },
      ],
    });
    if (!user) return res.status(404).json({ error: { message: "User not found" } });

    if (typeof name === "string" && name.trim()) {
      if (user.role === "student" && user.studentProfile) {
        await user.studentProfile.update({ fullName: name.trim() });
      } else if (user.role === "tutor" && user.tutorProfile) {
        await user.tutorProfile.update({ fullName: name.trim() });
      }
    }

    if (Object.keys(rest).length) await user.update(rest);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (String(req.user?.id) === String(id)) {
      return res.status(400).json({ error: { message: "You cannot delete your own account." } });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: { message: "User not found" } });
    await user.destroy();
    res.json({ deleted: true });
  } catch (e) { next(e); }
};

/* ----------------------- Tutor Ranks analytics & assignment ------------------------ */
const getTutorRankUsage = async (_, res, next) => {
  try {
    const ranks = await TutorRank.findAll({ order: [['name','ASC']] });
    const profiles = await TutorProfile.findAll({ attributes: ['rankId'] });
    const map = profiles.reduce((m, p) => { m[p.rankId] = (m[p.rankId]||0)+1; return m; }, {});
    res.json(ranks.map(r => ({ id: r.id, name: r.name, count: map[r.id] || 0 })));
  } catch (e) { next(e); }
};

const assignTutorRank = async (req, res, next) => {
  try {
    const { id } = req.params; // tutor userId
    const { rankId } = req.body;
    const profile = await TutorProfile.findOne({ where: { userId: id } });
    if (!profile) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }
    await profile.update({ rankId });
    res.json({ updated: true });
  } catch (e) { next(e); }
};

/* ----------------------- Exports ------------------------ */
module.exports = {
  // lookups
  listLanguages, createLanguage, updateLanguage, deleteLanguage,
  listSubjects, createSubject, updateSubject, deleteSubject,
  listGrades, createGrade, updateGrade, deleteGrade,
  listBacTypes, createBacType, updateBacType, deleteBacType,
  listTutorRanks, createTutorRank, updateTutorRank, deleteTutorRank,

  // sessions & bundles
  listSessions, createSession, updateSession, deleteSession,
  listBundles, createBundle, updateBundle, deleteBundle,

  // assignments & requests
  listAssignments, createAssignment, updateAssignment, deleteAssignment,
  listChangeRequests, decideChangeRequest,

  // feedback & reports
  listFeedback, reportConsumption, reportPayouts,

  // users & purchases
  listUsers, listStudentPurchases, getUser,

  // dashboard
  getDashboardStats, getRecentStudents, getRecentTutors,

  // manual payments
  listManualPayments, approveManualPayment, rejectManualPayment,

  // counts & generic user ops
  countUsers, countSessions, updateUser, deleteUser,

  // ranks
  getTutorRankUsage, assignTutorRank,
};
