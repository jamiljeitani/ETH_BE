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

// Import wallet service for cancellation policy
const walletService = require('./wallet.service');

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

async function cancelEvent(user, id, cancellationData) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }

  // Extract cancellation data (support both old and new format)
  const reason = cancellationData?.reason || cancellationData;
  const {
    charged = false,
    hoursUntilSession = null,
    cancelledBy = null,
    cancelledById = null,
    sessionCost = 0,
    applyWalletPolicy = false
  } = cancellationData || {};

  // Update event status
  await ev.update({ 
    status: 'cancelled', 
    cancelReason: reason || null,
    cancelledBy: cancelledById || user.id,
    cancelledAt: new Date()
  });

  let walletOperation = null;

  // Apply wallet policy if within 6 hours
  if (applyWalletPolicy && sessionCost > 0) {
    try {
      walletOperation = await applyCancellationWalletPolicy(ev, {
        cancelledBy,
        sessionCost,
        cancelledById: cancelledById || user.id
      });
    } catch (error) {
      console.error('Wallet operation failed during cancellation:', error);
      // Continue with cancellation even if wallet operation fails
    }
  }

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

  return { event: ev, walletOperation };
}

async function applyCancellationWalletPolicy(event, cancellationData) {
  const { cancelledBy, sessionCost, cancelledById } = cancellationData;
  
  if (cancelledBy === 'student') {
    // Student cancellation - consume session and pay tutor
    const result = await handleStudentCancellation(event, sessionCost);
    return result;
  } else if (cancelledBy === 'tutor') {
    // Tutor cancellation - deduct from tutor wallet (penalty)
    const result = await walletService.deductFromWallet(event.tutorId, sessionCost, {
      type: 'cancellation_penalty',
      referenceId: event.id,
      description: `Penalty for cancelling session within 6 hours`,
      allowNegative: true // Tutors can have negative balance
    });
    
    return {
      applied: true,
      type: 'penalty',
      amount: sessionCost,
      newBalance: result.newBalance,
      userId: event.tutorId
    };
  }
  
  return { applied: false };
}

async function handleStudentCancellation(event, sessionCost) {
  // 1. Consume student session (deduct from purchased sessions)
  if (event.purchaseId) {
    const purchase = await Purchase.findByPk(event.purchaseId);
    if (purchase) {
      await purchase.update({
        sessionsConsumed: sequelize.literal(`COALESCE("sessionsConsumed", 0) + 1`)
      });
    }
  }
  
  // 2. Pay tutor (add to tutor wallet)
  const tutorResult = await walletService.addToWallet(event.tutorId, sessionCost, {
    type: 'session_payment',
    referenceId: event.id,
    description: `Payment for session cancelled by student within 6 hours`
  });
  
  return {
    applied: true,
    type: 'session_consumption',
    amount: sessionCost,
    newBalance: tutorResult.newBalance,
    userId: event.tutorId
  };
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

async function createRecurringEvents(user, body) {
    const {
        // parity with single-create
        title,
        description,
        subjectId,
        purchaseId,

        // timing
        startAt,
        durationMinutes,

        // accept both legacy & new names
        count: countRaw,
        occurrences: occurrencesRaw,
        freq: freqRaw,
        frequency: frequencyRaw,

        backToBack: backToBackRaw,

        // location / type / meeting
        locationType,
        locationDetails,
        meetingUrl: meetingUrlRaw,
        meetingLink,

        // optional type parity (default to session)
        type: typeRaw,

        // tutors may specify the student (UI sends it)
        studentId: studentIdFromTutor,
    } = body || {};

    const type = (typeRaw || 'session');
    const meetingUrl = (meetingUrlRaw || meetingLink || '').trim() || null;

    // ----- Who's who -----
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

    // ----- Purchase & assignment checks -----
    const purchase = await Purchase.findByPk(purchaseId);
    if (!purchase || purchase.studentId !== studentId) {
        const e = new Error('Invalid purchaseId for the selected student.');
        e.status = 400; throw e;
    }

    const assignment = await Assignment.findOne({ where: { purchaseId } });
    if (!assignment) {
        const e = new Error('Purchase is not assigned to a tutor.');
        e.status = 400; throw e;
    }

    const tutorId = assignment.tutorId;
    if (user.role === 'tutor' && user.id !== tutorId) {
        const e = new Error('This purchase is not assigned to you.');
        e.status = 403; throw e;
    }

    // ----- Minutes & caps -----
    const purchasedMin = Number(purchase.sessionsPurchased || 0) * 60;
    const consumedMin  = Number(purchase.sessionsConsumed  || 0) * 60;
    const remainingMin = Math.max(0, purchasedMin - consumedMin);
    if (remainingMin < Number(durationMinutes)) {
        const e = new Error('Not enough remaining minutes to start a series.');
        e.status = 400; throw e;
    }

    const maxOccurrences = Math.floor(remainingMin / Number(durationMinutes));

    const futureBooked = await CalendarEvent.count({
        where: {
            purchaseId,
            type: 'session',
            status: { [Op.in]: ['proposed', 'accepted'] },
            startAt: { [Op.gte]: new Date() },
        }
    });

    const availableOccurrences = Math.max(0, maxOccurrences - futureBooked);
    if (availableOccurrences <= 0) {
        const e = new Error('No remaining sessions available on this purchase.');
        e.status = 400; throw e;
    }

    // ----- Recurrence interpretation -----
    const frequency = (frequencyRaw || freqRaw || 'weekly'); // default weekly (your prior behavior)
    const occurrences = (() => {
        const x = Number.isFinite(Number(countRaw)) ? Number(countRaw) : Number(occurrencesRaw);
        return Math.max(1, Number.isFinite(x) ? Math.floor(x) : 1);
    })();
    const backToBack = Math.max(1, Math.floor(Number(backToBackRaw || 1)));

    const statusInitial = (type === 'session') ? 'proposed' : 'accepted';

    // helper to shift per frequency
    const firstStart = dayjs(startAt);
    function shift(base, i) {
        if (frequency === 'daily')  return base.add(i, 'day');
        if (frequency === 'weekly') return base.add(i, 'week');
        return base; // 'once'
    }

    // Only block overlaps if creating accepted sessions
    async function hasOverlap(s, e, t) {
        if (!(type !== 'session' || statusInitial === 'accepted')) return false;
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

    // ----- Transactional creation -----
    const created = await sequelize.transaction(async (t) => {
        const batch = [];
        const totalCap = Math.min(availableOccurrences, occurrences * backToBack);
        for (let i = 0; i < occurrences; i++) {
            const base = shift(firstStart, i);
            for (let j = 0; j < backToBack; j++) {
                if (batch.length >= totalCap) break;

                const s = base.add(j * Number(durationMinutes), 'minute');
                const e = s.add(Number(durationMinutes), 'minute');

                if (await hasOverlap(s.toDate(), e.toDate(), t)) continue;

                const ev = await CalendarEvent.create({
                    title: title || null,
                    description: description || null,
                    type,
                    status: statusInitial,
                    startAt: s.toDate(),
                    endAt: e.toDate(),
                    locationType: locationType || null,
                    locationDetails: locationDetails || null,
                    meetingUrl,
                    subjectId: subjectId || null,
                    purchaseId: purchaseId || null,
                    studentId: studentId || null,
                    tutorId: tutorId || null,
                    createdBy: user.id,
                }, { transaction: t });

                batch.push(ev);
            }
        }

        if (batch.length === 0) {
            const e = new Error('All occurrences conflicted with existing events.');
            e.status = 409; throw e;
        }
        return batch;
    });

    // ----- Notifications (same as single-create) -----
    if (type === 'session' && tutorId && studentId) {
        try {
            const [student, tutor] = await Promise.all([
                User.findByPk(studentId),
                User.findByPk(tutorId),
            ]);
            await Promise.all(created.map((event) => {
                const mail = calendarProposedEmail({ event, student, tutor });
                return Promise.all([
                    student?.email ? sendVerifyEmail(student.email, mail.subject, mail.html) : null,
                    tutor?.email ? sendVerifyEmail(tutor.email, mail.subject, mail.html) : null,
                ]);
            }));
        } catch (_) { /* non-fatal */ }
    }

    return created;
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
