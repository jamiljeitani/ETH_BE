// services/session.service.js
const dayjs = require('dayjs');
const { Op } = require('sequelize');
const {
  sequelize, User, Purchase, Assignment, Session, SessionTiming, Consumption, Timesheet, SessionType
} = require('../models');
const { sendVerifyEmail } = require('./email.service');
const { feedbackRequestEmail } = require('../utils/emailTemplates');
const cfg = require('../config/env');

function ceilMinutes(ms) { return Math.max(0, Math.ceil(ms / 60000)); }

async function assertTutorOwnsPurchase(tutorId, purchaseId, t) {
  // Ensure the tutor is currently assigned to this purchase (Phase 5 created unique assignment per purchase)
  const a = await Assignment.findOne({ where: { purchaseId }, transaction: t });
  if (!a || a.tutorId !== tutorId) { const e = new Error('Tutor is not assigned to this purchase'); e.status = 403; throw e; }
  return a;
}

async function computeEffectiveRate(purchase, t) {
  // If purchase is for a custom sessionType, use that rate. Otherwise average bundle rate = amount / hoursPurchased.
  if (purchase.sessionTypeId) {
    const st = await SessionType.findByPk(purchase.sessionTypeId, { transaction: t });
    if (!st) { const e = new Error('SessionType missing'); e.status = 500; throw e; }
    return Number(st.hourlyRate);
  }
  const hours = purchase.hoursPurchased || 1; // avoid div by zero
  return Number(purchase.amount) / Number(hours);
}

async function start(tutorId, body) {
  const { purchaseId, calendarEventId, subjectId, deliveryMode, notes } = body;

  return sequelize.transaction(async (t) => {
    const purchase = await Purchase.findByPk(purchaseId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!purchase) { const e = new Error('Purchase not found'); e.status = 404; throw e; }
    if (!['active'].includes(purchase.status)) { const e = new Error('Purchase is not active'); e.status = 400; throw e; }

    await assertTutorOwnsPurchase(tutorId, purchaseId, t);

    // Only one active session at a time for this purchase + tutor
    const inProg = await Session.count({
      where: { purchaseId, tutorId, status: 'in_progress' }, transaction: t
    });
    if (inProg > 0) { const e = new Error('Another session is already in progress'); e.status = 409; throw e; }

    const session = await Session.create({
      purchaseId,
      calendarEventId: calendarEventId || null,
      studentId: purchase.studentId,
      tutorId,
      subjectId: subjectId || null,
      deliveryMode: deliveryMode || null,
      notes: notes || null,
      status: 'in_progress',
      startedAt: new Date()
    }, { transaction: t });

    await SessionTiming.create({
      sessionId: session.id,
      startedAt: new Date()
    }, { transaction: t });

    return session;
  });
}

async function pause(tutorId, id) {
  return sequelize.transaction(async (t) => {
    const session = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
    if (session.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (session.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

    const openSeg = await SessionTiming.findOne({
      where: { sessionId: id, endedAt: { [Op.is]: null } }, order: [['createdAt', 'DESC']], transaction: t, lock: t.LOCK.UPDATE
    });
    if (!openSeg) { const e = new Error('No running timer segment'); e.status = 400; throw e; }

    const end = new Date();
    const minutes = ceilMinutes(end - new Date(openSeg.startedAt));
    await openSeg.update({ endedAt: end, minutes }, { transaction: t });

    return { ok: true, minutesSegment: minutes };
  });
}

async function resume(tutorId, id) {
  return sequelize.transaction(async (t) => {
    const session = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
    if (session.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (session.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

    const openSeg = await SessionTiming.findOne({
      where: { sessionId: id, endedAt: { [Op.is]: null } }, transaction: t
    });
    if (openSeg) { const e = new Error('Timer is already running'); e.status = 400; throw e; }

    await SessionTiming.create({ sessionId: id, startedAt: new Date() }, { transaction: t });
    return { ok: true };
  });
}

async function end(tutorId, id) {
  return sequelize.transaction(async (t) => {
    const session = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
    if (session.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (session.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

    // close any open segment
    const openSeg = await SessionTiming.findOne({
      where: { sessionId: id, endedAt: { [Op.is]: null } }, order: [['createdAt', 'DESC']], transaction: t, lock: t.LOCK.UPDATE
    });
    if (openSeg) {
      const endAt = new Date();
      const minutes = ceilMinutes(endAt - new Date(openSeg.startedAt));
      await openSeg.update({ endedAt: endAt, minutes }, { transaction: t });
    }

    // compute total minutes
    const segments = await SessionTiming.findAll({ where: { sessionId: id }, transaction: t });
    const totalMinutes = segments.reduce((sum, s) => sum + (s.minutes || 0), 0);

    const purchase = await Purchase.findByPk(session.purchaseId, { transaction: t, lock: t.LOCK.UPDATE });
    const balanceTotalMinutes = Number(purchase.hoursPurchased) * 60;
    const consumedSoFarMinutes = Number(purchase.hoursConsumed) * 60;
    const remainingMinutes = Math.max(0, balanceTotalMinutes - consumedSoFarMinutes);

    const billable = Math.min(totalMinutes, remainingMinutes);
    const overage = Math.max(0, totalMinutes - billable);

    // update purchase consumed hours (in hours, 2 decimals)
    const newConsumedMinutes = consumedSoFarMinutes + billable;
    const newConsumedHours = Number((newConsumedMinutes / 60).toFixed(2));
    await purchase.update({ hoursConsumed: newConsumedHours }, { transaction: t });

    // record consumption
    await Consumption.create({
      purchaseId: purchase.id,
      sessionId: session.id,
      minutes: billable,
      balanceBeforeMinutes: remainingMinutes,
      balanceAfterMinutes: Math.max(0, remainingMinutes - billable)
    }, { transaction: t });

    // create timesheet row
    const rate = await computeEffectiveRate(purchase, t); // per hour
    const amount = Number(((billable / 60) * rate).toFixed(2));
    await Timesheet.create({
      tutorId: session.tutorId,
      sessionId: session.id,
      minutes: billable,
      rate,
      amount,
      currency: purchase.currency || 'USD',
      status: 'pending'
    }, { transaction: t });

    await session.update({
      status: 'completed',
      endedAt: new Date(),
      totalMinutes: totalMinutes,
      overageMinutes: overage
    }, { transaction: t });

    // Phase 8: send feedback request emails to both student & tutor
    const [student, tutor] = await Promise.all([
      User.findByPk(session.studentId, { transaction: t }),
      User.findByPk(session.tutorId, { transaction: t })
    ]);

    const mailToStudent = feedbackRequestEmail({ session, forRole: 'student', baseUrl: cfg.baseUrl });
    const mailToTutor   = feedbackRequestEmail({ session, forRole: 'tutor',   baseUrl: cfg.baseUrl });

    await sendVerifyEmail(student.email, mailToStudent.subject, mailToStudent.html);
    await sendVerifyEmail(tutor.email,   mailToTutor.subject,   mailToTutor.html);

    return { session, billableMinutes: billable, overageMinutes: overage, rate, amount };
  });
}

async function getMine(user, id) {
  const where = { id };
  if (user.role === 'student') where.studentId = user.id;
  if (user.role === 'tutor') where.tutorId = user.id;
  // admin can view any
  const session = await Session.findOne({
    where,
    include: [{ association: 'purchase' }, { association: 'student' }, { association: 'tutor' }, { association: 'subject' }, { association: 'timings' }]
  });
  if (!session) { const e = new Error('Not found'); e.status = 404; throw e; }
  return session;
}

module.exports = { start, pause, resume, end, getMine };
