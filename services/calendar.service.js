// services/calendar.service.js
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const {
  sequelize, User, Subject, Purchase,
  CalendarEvent
} = require('../models');
const { calendarProposedEmail, calendarStatusEmail } = require('../utils/emailTemplates');
const { sendVerifyEmail } = require('./email.service');

function isParticipant(user, ev) {
  return user.role === 'admin' || ev.studentId === user.id || ev.tutorId === user.id;
}

async function assertRoles(studentId, tutorId) {
  const [s, t] = await Promise.all([
    User.findByPk(studentId), User.findByPk(tutorId)
  ]);
  if (!s || s.role !== 'student') { const e = new Error('Invalid studentId'); e.status = 400; throw e; }
  if (!t || t.role !== 'tutor') { const e = new Error('Invalid tutorId'); e.status = 400; throw e; }
  return { student: s, tutor: t };
}

async function hasConflictFor(participantId, startAt, endAt, ignoreEventId = null) {
  const where = {
    status: 'accepted',
    [Op.or]: [{ studentId: participantId }, { tutorId: participantId }],
    startAt: { [Op.lt]: endAt },
    endAt:   { [Op.gt]: startAt }
  };
  if (ignoreEventId) where.id = { [Op.ne]: ignoreEventId };
  const count = await CalendarEvent.count({ where });
  return count > 0;
}

async function listEvents(user, { from, to, studentId, tutorId, status }) {
  const where = {};
  if (from) where.startAt = { ...(where.startAt || {}), [Op.gte]: new Date(from) };
  if (to)   where.endAt   = { ...(where.endAt || {}),   [Op.lte]: new Date(to) };
  if (status) where.status = status;

  if (user.role === 'admin') {
    if (studentId) where.studentId = studentId;
    if (tutorId) where.tutorId = tutorId;
  } else if (user.role === 'student') {
    where.studentId = user.id;
  } else if (user.role === 'tutor') {
    where.tutorId = user.id;
  }

  return CalendarEvent.findAll({
    where,
    order: [['startAt', 'ASC']],
    include: [
      { association: 'student', attributes: ['id', 'email'] },
      { association: 'tutor', attributes: ['id', 'email'] },
      { association: 'subject' },
      { association: 'purchase' },
      { association: 'parentEvent', attributes: ['id', 'startAt', 'endAt', 'status'] }
    ]
  });
}

async function createEvent(creator, payload) {
  const {
    title, description, type = 'session', startAt, endAt,
    locationType, locationDetails, subjectId, purchaseId,
    studentId, tutorId
  } = payload;

  // infer missing counterpart based on role
  let sId = studentId;
  let tId = tutorId;
  if (creator.role === 'student') {
    sId = creator.id;
    if (!tId) { const e = new Error('tutorId is required'); e.status = 400; throw e; }
  } else if (creator.role === 'tutor') {
    tId = creator.id;
    if (!sId) { const e = new Error('studentId is required'); e.status = 400; throw e; }
  } else if (creator.role === 'admin') {
    if (!sId || !tId) { const e = new Error('studentId and tutorId are required'); e.status = 400; throw e; }
  }

  await assertRoles(sId, tId);

  // Optional: validate subject/purchase existence
  if (subjectId) {
    const sub = await Subject.findByPk(subjectId);
    if (!sub) { const e = new Error('Invalid subjectId'); e.status = 400; throw e; }
  }
  if (purchaseId) {
    const p = await Purchase.findByPk(purchaseId);
    if (!p) { const e = new Error('Invalid purchaseId'); e.status = 400; throw e; }
  }

  // Conflict check on ACCEPTED events
  const sConflict = await hasConflictFor(sId, new Date(startAt), new Date(endAt));
  const tConflict = await hasConflictFor(tId, new Date(startAt), new Date(endAt));
  if (sConflict || tConflict) {
    const e = new Error('Time conflict with an accepted event'); e.status = 409; throw e;
  }

  const ev = await CalendarEvent.create({
    title, description, type, status: 'proposed',
    startAt, endAt, locationType, locationDetails,
    studentId: sId, tutorId: tId, createdBy: creator.id,
    subjectId: subjectId || null, purchaseId: purchaseId || null
  });

  // Notify counterpart
  const student = await User.findByPk(sId);
  const tutor = await User.findByPk(tId);
  const mailS = calendarProposedEmail({ recipientRole: 'student', event: ev, otherEmail: tutor.email });
  const mailT = calendarProposedEmail({ recipientRole: 'tutor', event: ev, otherEmail: student.email });

  // Send to both
  await sendVerifyEmail(student.email, mailS.subject, mailS.html);
  await sendVerifyEmail(tutor.email, mailT.subject, mailT.html);

  return ev;
}

async function acceptEvent(user, id) {
  return sequelize.transaction(async (t) => {
    const ev = await CalendarEvent.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!ev) { const e = new Error('Not found'); e.status = 404; throw e; }
    if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (ev.status !== 'proposed') { const e = new Error('Only proposed events can be accepted'); e.status = 400; throw e; }

    // conflict check again on accept
    const sConflict = await hasConflictFor(ev.studentId, ev.startAt, ev.endAt, ev.id);
    const tConflict = await hasConflictFor(ev.tutorId, ev.startAt, ev.endAt, ev.id);
    if (sConflict || tConflict) {
      const e = new Error('Time conflict with an accepted event'); e.status = 409; throw e;
    }

    await ev.update({ status: 'accepted', decisionReason: null }, { transaction: t });

    const student = await User.findByPk(ev.studentId, { transaction: t });
    const tutor = await User.findByPk(ev.tutorId, { transaction: t });
    const mail = calendarStatusEmail({ event: ev, status: 'accepted' });
    await sendVerifyEmail(student.email, mail.subject, mail.html);
    await sendVerifyEmail(tutor.email, mail.subject, mail.html);

    return ev;
  });
}

async function rejectEvent(user, id, reason) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (!['proposed'].includes(ev.status)) { const e = new Error('Only proposed events can be rejected'); e.status = 400; throw e; }

  await ev.update({ status: 'rejected', decisionReason: reason || null });

  const student = await User.findByPk(ev.studentId);
  const tutor = await User.findByPk(ev.tutorId);
  const mail = calendarStatusEmail({ event: ev, status: 'rejected', reason });
  await sendVerifyEmail(student.email, mail.subject, mail.html);
  await sendVerifyEmail(tutor.email, mail.subject, mail.html);

  return ev;
}

async function cancelEvent(user, id, reason) {
  const ev = await CalendarEvent.findByPk(id);
  if (!ev) { const e = new Error('Not found'); e.status = 404; throw e; }
  if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (!['proposed', 'accepted'].includes(ev.status)) { const e = new Error('Cannot cancel this event'); e.status = 400; throw e; }

  await ev.update({ status: 'cancelled', decisionReason: reason || null });

  const student = await User.findByPk(ev.studentId);
  const tutor = await User.findByPk(ev.tutorId);
  const mail = calendarStatusEmail({ event: ev, status: 'cancelled', reason });
  await sendVerifyEmail(student.email, mail.subject, mail.html);
  await sendVerifyEmail(tutor.email, mail.subject, mail.html);

  return ev;
}

async function rescheduleEvent(user, id, { startAt, endAt, note }) {
  return sequelize.transaction(async (t) => {
    const ev = await CalendarEvent.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!ev) { const e = new Error('Not found'); e.status = 404; throw e; }
    if (!isParticipant(user, ev)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (!['proposed', 'accepted'].includes(ev.status)) { const e = new Error('Cannot reschedule this event'); e.status = 400; throw e; }

    const sConflict = await hasConflictFor(ev.studentId, new Date(startAt), new Date(endAt), ev.id);
    const tConflict = await hasConflictFor(ev.tutorId,   new Date(startAt), new Date(endAt), ev.id);
    if (sConflict || tConflict) {
      const e = new Error('Time conflict with an accepted event'); e.status = 409; throw e;
    }

    // mark original as rescheduled
    await ev.update({ status: 'rescheduled', decisionReason: note || null }, { transaction: t });

    // create new proposed event with same metadata
    const next = await CalendarEvent.create({
      title: ev.title, description: ev.description, type: ev.type,
      status: 'proposed',
      startAt, endAt,
      locationType: ev.locationType, locationDetails: ev.locationDetails,
      studentId: ev.studentId, tutorId: ev.tutorId, createdBy: user.id,
      subjectId: ev.subjectId, purchaseId: ev.purchaseId,
      rescheduleOf: ev.id
    }, { transaction: t });

    const student = await User.findByPk(ev.studentId, { transaction: t });
    const tutor = await User.findByPk(ev.tutorId, { transaction: t });
    const mail = calendarStatusEmail({ event: next, status: 'rescheduled', note });
    await sendVerifyEmail(student.email, mail.subject, mail.html);
    await sendVerifyEmail(tutor.email, mail.subject, mail.html);

    return next;
  });
}

module.exports = {
  listEvents,
  createEvent,
  acceptEvent,
  rejectEvent,
  cancelEvent,
  rescheduleEvent
};
