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
  { model: Purchase, as: 'purchase', attributes: ['id','sessionsPurchased','sessionsConsumed'] },
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
    const _rows = await CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
    return _rows.map(ev => {
      const p = ev.purchase;
      const sessionsRemaining = (p && Number.isFinite(p.sessionsPurchased) && Number.isFinite(p.sessionsConsumed))
        ? Math.max(0, Number(p.sessionsPurchased) - Number(p.sessionsConsumed)) : null;
      const data = ev.toJSON();
      data.sessionsRemaining = sessionsRemaining;
      if (!data.title && sessionsRemaining != null) {
        data.title = `Session • rem: ${sessionsRemaining}`;
      }
      return data;
    });
  }

  if (user.role === 'student') {
    where.studentId = user.id;
    const _rows = await CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
    return _rows.map(ev => {
      const p = ev.purchase;
      const sessionsRemaining = (p && Number.isFinite(p.sessionsPurchased) && Number.isFinite(p.sessionsConsumed))
        ? Math.max(0, Number(p.sessionsPurchased) - Number(p.sessionsConsumed)) : null;
      const data = ev.toJSON();
      data.sessionsRemaining = sessionsRemaining;
      if (!data.title && sessionsRemaining != null) {
        data.title = `Session • rem: ${sessionsRemaining}`;
      }
      return data;
    });
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

    const _rows = await CalendarEvent.findAll({ where, include: includeTree, order: [['startAt','ASC']] });
    return _rows.map(ev => {
      const p = ev.purchase;
      const sessionsRemaining = (p && Number.isFinite(p.sessionsPurchased) && Number.isFinite(p.sessionsConsumed))
        ? Math.max(0, Number(p.sessionsPurchased) - Number(p.sessionsConsumed)) : null;
      const data = ev.toJSON();
      data.sessionsRemaining = sessionsRemaining;
      if (!data.title && sessionsRemaining != null) {
        data.title = `Session • rem: ${sessionsRemaining}`;
      }
      return data;
    });
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

  // normalize meeting link (accept both keys)
  const meetingUrlRaw = (body?.meetingUrl || body?.meetingLink || '').trim();
  const meetingUrl = meetingUrlRaw || null;

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
    meetingUrl, // ⬅️ store optional meeting link
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

async function rescheduleEvent(user, id, { startAt, endAt, note, meetingUrl: mUrlRaw, meetingLink: mLinkRaw }) {
  const prev = await CalendarEvent.findByPk(id);
  if (!prev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, prev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  // normalize updated meeting url (if provided); otherwise keep previous value
  const normalizedMeetingUrl = (mUrlRaw || mLinkRaw || '').trim() || prev.meetingUrl || null;

  // mark the old one as 'rescheduled'
  await prev.update({ status: 'rescheduled' });

  // create a new 'proposed' session with same participants (carry over/override meetingUrl)
  const next = await CalendarEvent.create({
    title: prev.title,
    description: note || prev.description || null,
    type: prev.type,
    status: prev.type === 'session' ? 'proposed' : 'accepted',
    startAt,
    endAt,
    locationType: prev.locationType,
    locationDetails: prev.locationDetails,
    meetingUrl: normalizedMeetingUrl,
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

// ------------------------------------------------------------------
// (unchanged) createRecurringEvents
// ------------------------------------------------------------------
async function createRecurringEvents(user, body) {
  const {
    title, description, subjectId, purchaseId,
    startAt, durationMinutes, count,
    studentId: studentIdFromTutor // tutor only
  } = body;

  let studentId = user.id;
  if (user.role === 'tutor') {
    if (!studentIdFromTutor) {
      const e = new Error('studentId is required when tutor creates a series.');
      e.status = 400; throw e;
    }
    studentId = studentIdFromTutor;
  } else if (user.role !== 'student' && user.role !== 'admin') {
    const e = new Error('Not allowed.');
    e.status = 403; throw e;
  }

  const purchase = await Purchase.findByPk(purchaseId);
  if (!purchase || purchase.studentId !== studentId) {
    const e = new Error('Invalid purchaseId for the selected student.');
    e.status = 400; throw e;
  }

  const assignment = await Assignment.findOne({ where: { purchaseId } });
  if (!assignment) { const e = new Error('Purchase is not assigned to a tutor.'); e.status = 400; throw e; }

  const tutorId = assignment.tutorId;
  if (user.role === 'tutor' && user.id !== tutorId) {
    const e = new Error('This purchase is not assigned to you.');
    e.status = 403; throw e;
  }

  const totalNeededMinutes = durationMinutes * count;
  const purchasedMin = Number(purchase.sessionsPurchased || 0) * 60;
  const consumedMin  = Number(purchase.sessionsConsumed  || 0) * 60;
  const remainingMin = Math.max(0, purchasedMin - consumedMin);
  if (remainingMin < durationMinutes) {
    const e = new Error('Not enough remaining minutes to start a series.');
    e.status = 400; throw e;
  }

  const maxOccurrences = Math.floor(remainingMin / durationMinutes);
  const futureBooked = await CalendarEvent.count({
    where: {
      purchaseId,
      type: 'session',
      status: { [Op.in]: ['proposed','accepted'] },
      startAt: { [Op.gte]: new Date() },
    }
  });
  const availableOccurrences = Math.max(0, maxOccurrences - futureBooked);
  if (count > availableOccurrences) {
    const e = new Error(`Not enough remaining sessions. Requested ${count}, available ${availableOccurrences}.`);
    e.status = 400; throw e;
  }

  const firstStart = dayjs(startAt);
  const eventsToCreate = [];
  for (let i = 0; i < count; i++) {
    const s = firstStart.add(i, 'week');
    const e = s.add(durationMinutes, 'minute');
    eventsToCreate.push({ startAt: s.toDate(), endAt: e.toDate() });
  }

  async function hasOverlap(s, e, t) {
    const where = {
      [Op.or]: [
        { tutorId,   status: { [Op.in]: ['proposed','accepted'] } },
        { studentId, status: { [Op.in]: ['proposed','accepted'] } },
      ],
      startAt: { [Op.lt]: e },
      endAt:   { [Op.gt]: s },
    };
    const cnt = await CalendarEvent.count({ where, transaction: t });
    return cnt > 0;
  }

  return await sequelize.transaction(async (t) => {
    const created = [];
    for (const occ of eventsToCreate) {
      const overlap = await hasOverlap(occ.startAt, occ.endAt, t);
      if (overlap) continue;

      const ev = await CalendarEvent.create({
        title: title || 'Session',
        description: description || null,
        type: 'session',
        status: (user.role === 'tutor') ? 'accepted' : 'proposed',
        startAt: occ.startAt,
        endAt: occ.endAt,
        studentId,
        tutorId,
        subjectId: subjectId || null,
        purchaseId,
        createdBy: user.id,
      }, { transaction: t });

      created.push(ev);
    }

    if (created.length === 0) {
      const e = new Error('All occurrences conflicted with existing events.');
      e.status = 409; throw e;
    }
    return created;
  });
}

module.exports = {
  listEvents,
  createEvent,
  acceptEvent,
  rejectEvent,
  cancelEvent,
  rescheduleEvent,
  createRecurringEvents
};
