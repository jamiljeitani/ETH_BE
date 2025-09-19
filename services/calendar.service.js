// services/calendar.service.js
const { Op } = require('sequelize');
const dayjs = require('dayjs');

const {
  sequelize,
  User,
  Subject,
  Purchase,
  CalendarEvent,
  Assignment, // <-- used to find the student's assigned tutor
} = require('../models');

// If you don't have these utilities, you can stub them safely:
let sendVerifyEmail = async () => {};
let calendarProposedEmail = () => ({ subject: '', html: '' });
let calendarStatusEmail = () => ({ subject: '', html: '' });
try {
  ({ sendVerifyEmail } = require('./email.service'));
  ({ calendarProposedEmail, calendarStatusEmail } = require('../utils/emailTemplates'));
} catch (_) { /* optional utilities */ }

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------
function isParticipant(user, ev) {
  return (
    user.role === 'admin' ||
    ev.studentId === user.id ||
    ev.tutorId === user.id
  );
}

// choose the latest/active assignment linking this student to a tutor
async function getAssignedTutorId(studentId) {
  const a = await Assignment.findOne({
    where: { studentId },
    order: [['createdAt', 'DESC']],
    attributes: ['tutorId'],
  });
  return a?.tutorId || null;
}

async function getAssignedStudentIdsForTutor(tutorId) {
  const rows = await Assignment.findAll({
    where: { tutorId },
    attributes: ['studentId'],
  });
  return rows.map(r => r.studentId);
}

function normalizeDatesFilter(from, to) {
  const where = {};
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt[Op.gte] = new Date(from);
    if (to) where.startAt[Op.lt] = new Date(to);
  }
  return where;
}

const includeTree = [
  { model: User, as: 'student', attributes: ['id', 'email'] },
  { model: User, as: 'tutor', attributes: ['id', 'email'] },
  { model: Subject, as: 'subject', attributes: ['id', 'name'] },
];

// ------------------------------------------------------------------
// list events (role-aware)
// ------------------------------------------------------------------
async function listEvents(user, query = {}) {
  const { role, from, to, studentId, tutorId } = query;

  const timeFilter = normalizeDatesFilter(from, to);
  let where = { ...timeFilter };

  // Admin can pass filters directly
  if (user.role === 'admin') {
    if (studentId) where.studentId = studentId;
    if (tutorId) where.tutorId = tutorId;
    return CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
  }

  if (user.role === 'student') {
    where.studentId = user.id;
    return CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
  }

  // tutor: show
  // 1) everything where tutorId = me
  // 2) PLUS: 'exam'/'target' of my assigned students (even if not explicitly linked)
  if (user.role === 'tutor') {
    const myStudentIds = await getAssignedStudentIdsForTutor(user.id);

    where = {
      ...timeFilter,
      [Op.or]: [
        { tutorId: user.id },
        {
          type: { [Op.in]: ['exam', 'target'] },
          studentId: { [Op.in]: myStudentIds.length ? myStudentIds : ['__none__'] },
        },
      ],
    };

    return CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
  }

  // fallback: nothing
  return [];
}

// ------------------------------------------------------------------
// create event
// ------------------------------------------------------------------
async function createEvent(creator, body) {
  const {
    title,
    description,
    type = 'session',
    startAt,
    endAt,
    locationType,
    locationDetails,
    subjectId,
    purchaseId,
  } = body || {};

  // derive sides
  let { studentId, tutorId } = body || {};
  if (creator.role === 'student') {
    studentId = creator.id;
    // For exams/targets, we attempt to attach the assigned tutor automatically
    if (!tutorId && (type === 'exam' || type === 'target' || type === 'session')) {
      tutorId = await getAssignedTutorId(studentId);
    }
  } else if (creator.role === 'tutor') {
    tutorId = creator.id;
    // studentId must be present for a session created by tutor
    if (type === 'session' && !studentId) {
      const e = new Error('studentId is required for session creation by tutors');
      e.status = 400; throw e;
    }
  } else if (creator.role !== 'admin') {
    const e = new Error('Unauthorized');
    e.status = 403; throw e;
  }

  // conflict detection only for accepted sessions (we allow proposing overlaps)
  const initialStatus = (type === 'session') ? 'proposed' : 'accepted'; // exams/targets are immediately "confirmed"

  // Create
  const ev = await CalendarEvent.create({
    title: title || null,
    description: description || null,
    type,
    status: initialStatus,
    startAt,
    endAt,
    locationType: locationType || null,
    locationDetails: locationDetails || null,
    subjectId: subjectId || null,
    purchaseId: purchaseId || null,
    studentId: studentId || null,
    tutorId: tutorId || null,
    createdBy: creator.id,
  });

  // Notify counterpart only for sessions
  if (type === 'session' && tutorId && studentId) {
    try {
      const [student, tutor] = await Promise.all([
        User.findByPk(studentId),
        User.findByPk(tutorId),
      ]);
      const mail = calendarProposedEmail({ event: ev, student, tutor });
      await Promise.all([
        student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
        tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
      ]);
    } catch (_) { /* non-fatal */ }
  }

  return ev;
}

// ------------------------------------------------------------------
// accept / reject / cancel / reschedule
// ------------------------------------------------------------------
async function acceptEvent(user, id) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  // Only 'session' can be accepted; exams/targets are already accepted
  if (ev.type !== 'session') return ev;

  await ev.update({ status: 'accepted' });

  try {
    const [student, tutor] = await Promise.all([
      User.findByPk(ev.studentId),
      User.findByPk(ev.tutorId),
    ]);
    const mail = calendarStatusEmail({ event: ev, status: 'accepted', student, tutor });
    await Promise.all([
      student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
      tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
    ]);
  } catch (_) {}

  return ev;
}

async function rejectEvent(user, id, reason) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  // exams/targets are personal; we treat reject only for sessions
  if (ev.type !== 'session') return ev;

  await ev.update({ status: 'rejected', cancelReason: reason || null });

  try {
    const [student, tutor] = await Promise.all([
      User.findByPk(ev.studentId),
      User.findByPk(ev.tutorId),
    ]);
    const mail = calendarStatusEmail({ event: ev, status: 'rejected', student, tutor });
    await Promise.all([
      student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
      tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
    ]);
  } catch (_) {}

  return ev;
}

async function cancelEvent(user, id, reason) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  await ev.update({ status: 'cancelled', cancelReason: reason || null });

  try {
    const [student, tutor] = await Promise.all([
      User.findByPk(ev.studentId),
      User.findByPk(ev.tutorId),
    ]);
    const mail = calendarStatusEmail({ event: ev, status: 'cancelled', student, tutor });
    await Promise.all([
      student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
      tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
    ]);
  } catch (_) {}

  return ev;
}

async function rescheduleEvent(user, id, { startAt, endAt, note }) {
  const prev = await CalendarEvent.findByPk(id);
  if (!prev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, prev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  // mark the old one as 'rescheduled'
  await prev.update({ status: 'rescheduled' });

  // create a new 'proposed' session with same participants
  const next = await CalendarEvent.create({
    title: prev.title,
    description: note || prev.description || null,
    type: prev.type,
    status: prev.type === 'session' ? 'proposed' : 'accepted',
    startAt,
    endAt,
    locationType: prev.locationType,
    locationDetails: prev.locationDetails,
    subjectId: prev.subjectId,
    purchaseId: prev.purchaseId,
    studentId: prev.studentId,
    tutorId: prev.tutorId,
    createdBy: user.id,
  });

  try {
    const [student, tutor] = await Promise.all([
      User.findByPk(prev.studentId),
      User.findByPk(prev.tutorId),
    ]);
    const mail = calendarStatusEmail({ event: next, status: 'rescheduled', student, tutor });
    await Promise.all([
      student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
      tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
    ]);
  } catch (_) {}

  return next;
}

module.exports = {
  listEvents,
  createEvent,
  acceptEvent,
  rejectEvent,
  cancelEvent,
  rescheduleEvent,
};
