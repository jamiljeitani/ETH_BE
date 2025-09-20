// server/services/session.service.js
const { Op } = require('sequelize');
const {
  sequelize, User, Purchase, Assignment, Session, SessionTiming, Consumption, Timesheet, SessionType
} = require('../models');

/* ---------- utils ---------- */
const ceilMinutes = (ms) => Math.max(0, Math.ceil(ms / 60000));
const toCents = (n) => Math.round(Number(n || 0) * 100);
const getTypeKey = (model, field) => (model?.rawAttributes?.[field]?.type?.key || '').toUpperCase();
const isIntCol = (m, f) => ['INTEGER','BIGINT'].includes(getTypeKey(m,f));
const isDecCol = (m, f) => ['DECIMAL','FLOAT'].includes(getTypeKey(m,f));

async function assertTutorOwnsPurchase(tutorId, purchaseId, t) {
  const a = await Assignment.findOne({ where: { purchaseId }, transaction: t });
  if (!a || a.tutorId !== tutorId) {
    const e = new Error('Tutor is not assigned to this purchase'); e.status = 403; throw e;
  }
}

async function effectiveRatePerHour(purchase, t) {
  if (purchase.sessionTypeId) {
    const st = await SessionType.findByPk(purchase.sessionTypeId, { transaction: t });
    if (st?.rate != null) return Number(st.rate);
  }
  const hours = Number(purchase.hoursPurchased || 0);
  if (hours > 0 && purchase.amount != null) return Number(purchase.amount) / hours;
  return Number(purchase.rate || 0);
}

/* ---------- lifecycle ---------- */
exports.start = async (tutorId, body) => {
  const { purchaseId, calendarEventId, subjectId, deliveryMode, notes } = body;
  return sequelize.transaction(async (t) => {
    const purchase = await Purchase.findByPk(purchaseId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!purchase) { const e = new Error('Purchase not found'); e.status = 404; throw e; }
    if (!['active','pending'].includes(purchase.status)) { const e = new Error('Purchase is not active'); e.status = 400; throw e; }

    await assertTutorOwnsPurchase(tutorId, purchaseId, t);

    const already = await Session.count({ where: { purchaseId, tutorId, status: 'in_progress' }, transaction: t });
    if (already) { const e = new Error('Another session is already in progress'); e.status = 409; throw e; }

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

    await SessionTiming.create({ sessionId: session.id, startedAt: new Date() }, { transaction: t });

    return session;
  });
};

exports.pause = async (tutorId, id) => sequelize.transaction(async (t) => {
  const s = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!s) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (s.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (s.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

  const seg = await SessionTiming.findOne({
    where: { sessionId: id, endedAt: { [Op.is]: null } },
    order: [['createdAt', 'DESC']], transaction: t, lock: t.LOCK.UPDATE
  });
  if (!seg) { const e = new Error('No running timer segment'); e.status = 400; throw e; }

  const end = new Date();
  const minutes = ceilMinutes(end - new Date(seg.startedAt));
  await seg.update({ endedAt: end, minutes }, { transaction: t });

  return { ok: true, minutesSegment: minutes };
});

exports.resume = async (tutorId, id) => sequelize.transaction(async (t) => {
  const s = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!s) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (s.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (s.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

  const open = await SessionTiming.findOne({ where: { sessionId: id, endedAt: { [Op.is]: null } }, transaction: t });
  if (open) { const e = new Error('Timer is already running'); e.status = 400; throw e; }

  await SessionTiming.create({ sessionId: id, startedAt: new Date() }, { transaction: t });
  return { ok: true };
});

exports.end = async (tutorId, id) => sequelize.transaction(async (t) => {
  const s = await Session.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!s) { const e = new Error('Session not found'); e.status = 404; throw e; }
  if (s.tutorId !== tutorId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (s.status !== 'in_progress') { const e = new Error('Session not in progress'); e.status = 400; throw e; }

  // close any open segment
  const open = await SessionTiming.findOne({
    where: { sessionId: id, endedAt: { [Op.is]: null } }, order: [['createdAt','DESC']],
    transaction: t, lock: t.LOCK.UPDATE
  });
  if (open) {
    const endAt = new Date();
    const minutes = ceilMinutes(endAt - new Date(open.startedAt));
    await open.update({ endedAt: endAt, minutes }, { transaction: t });
  }

  // recompute minutes
  const segs = await SessionTiming.findAll({ where: { sessionId: id }, transaction: t });
  const totalMinutes = segs.reduce((sum, x) => sum + (x.minutes || 0), 0);

  const purchase = await Purchase.findByPk(s.purchaseId, { transaction: t, lock: t.LOCK.UPDATE });

  // remaining balance
  const totalBalMin = (typeof purchase.minutesTotal === 'number' ? purchase.minutesTotal
                      : Number(purchase.hoursPurchased || 0) * 60);
  const consumedMin = (typeof purchase.minutesConsumed === 'number' ? purchase.minutesConsumed
                      : Number(purchase.hoursConsumed || 0) * 60);
  const remainingMin = Math.max(0, totalBalMin - consumedMin);

  const billable = Math.min(totalMinutes, remainingMin);
  const overage  = Math.max(0, totalMinutes - billable);

  // update purchase minute fields if present
  const updates = {};
  if ('minutesConsumed' in purchase) updates.minutesConsumed =
    isIntCol(Purchase,'minutesConsumed') ? (consumedMin + billable) : Number(consumedMin + billable);
  if ('hoursConsumed' in purchase) {
    const h = (consumedMin + billable) / 60;
    updates.hoursConsumed = isIntCol(Purchase,'hoursConsumed') ? Math.floor(h) : Number(h.toFixed(2));
  }
  if ('minutesRemaining' in purchase) updates.minutesRemaining =
    isIntCol(Purchase,'minutesRemaining') ? Math.max(0, remainingMin - billable) : Number(Math.max(0, remainingMin - billable));
  if (Object.keys(updates).length) await purchase.update(updates, { transaction: t });

  // record consumption
  await Consumption.create({
    purchaseId: purchase.id,
    sessionId: s.id,
    minutes: billable,
    balanceBeforeMinutes: remainingMin,
    balanceAfterMinutes: Math.max(0, remainingMin - billable)
  }, { transaction: t });

  // money
  const rateHr = await effectiveRatePerHour(purchase, t);
  const amount = (billable / 60) * Number(rateHr);

  const moneyPayload = {};
  if ('rate' in Timesheet.rawAttributes) moneyPayload.rate =
    isIntCol(Timesheet,'rate') ? toCents(rateHr) : Number(rateHr);
  if ('amount' in Timesheet.rawAttributes) moneyPayload.amount =
    isIntCol(Timesheet,'amount') ? toCents(amount) : Number(amount.toFixed(2));

  await Timesheet.create({
    tutorId: s.tutorId,
    studentId: s.studentId,
    sessionId: s.id,
    minutes: billable,
    currency: purchase.currency || 'USD',
    status: 'pending',
    ...moneyPayload
  }, { transaction: t });

  await s.update({ status: 'completed', endedAt: new Date(), totalMinutes, overageMinutes: overage }, { transaction: t });

  return { sessionId: s.id, billableMinutes: billable, overageMinutes: overage, ratePerHour: Number(rateHr), amount: Number(amount.toFixed(2)) };
});

exports.getMine = async (user, id) => {
  const where = { id };
  if (user.role === 'tutor') where.tutorId = user.id;
  if (user.role === 'student') where.studentId = user.id;
  const s = await Session.findOne({
    where, include: [{ association: 'purchase' }, { association: 'timings' }]
  });
  if (!s) { const e = new Error('Not found'); e.status = 404; throw e; }
  return s;
};

/* ---------- NEW: list sessions for current user (with earnings) ---------- */
exports.listMine = async (user, query = {}) => {
  const where = {};
  if (user.role === 'tutor') where.tutorId = user.id;
  if (user.role === 'student') where.studentId = user.id;
  if (query.status) where.status = query.status;

  const sessions = await Session.findAll({
    where,
    include: [{ association: 'purchase' }, { association: 'timings' }],
    order: [['createdAt','DESC']]
  });

  const rows = [];
  for (const s of sessions) {
    const now = Date.now();
    const minutes = (s.status === 'in_progress')
      ? (s.timings || []).reduce((sum, seg) => {
          const a = new Date(seg.startedAt).getTime();
          const b = seg.endedAt ? new Date(seg.endedAt).getTime() : now;
          return sum + ceilMinutes(b - a);
        }, 0)
      : Number(s.totalMinutes || 0);

    let rateHr = 0, amount = 0;
    if (s.purchase) {
      rateHr = await effectiveRatePerHour(s.purchase, null);
      amount = (minutes / 60) * Number(rateHr);
    }

    const rateOut = isIntCol(Timesheet,'rate') ? toCents(rateHr) : Number(rateHr);
    const amountOut = isIntCol(Timesheet,'amount') ? toCents(amount) : Number(amount.toFixed(2));

    rows.push({
      sessionId: s.id,
      status: s.status,
      minutes,
      rate: rateOut,
      amount: amountOut,
      currency: s.purchase?.currency || 'USD',
      purchaseId: s.purchase?.id || s.purchaseId
    });
  }
  return { rows };
};

/* ---------- NEW: list purchases assigned to this tutor ---------- */
exports.listAssignedPurchases = async (user) => {
  if (user.role !== 'tutor') { const e = new Error('Forbidden'); e.status = 403; throw e; }

  const assigns = await Assignment.findAll({
    where: { tutorId: user.id },
    include: [{ association: 'purchase', include: [{ association: 'bundle' }, { association: 'student' }] }],
    order: [['createdAt','DESC']]
  });

  return assigns.map(a => {
    const p = a.purchase || {};
    const totalMin = (typeof p.minutesTotal === 'number') ? p.minutesTotal : Number(p.hoursPurchased || 0) * 60;
    const consumedMin = (typeof p.minutesConsumed === 'number') ? p.minutesConsumed : Number(p.hoursConsumed || 0) * 60;
    const remaining = Math.max(0, totalMin - consumedMin);

    return {
      id: p.id,
      displayName: p.bundle?.name ? `${p.bundle.name} • ${p.student?.name || 'Student'}` : `Purchase ${p.id}`,
      minutesRemaining: remaining,
      student: p.student ? { id: p.student.id, name: p.student.name } : null,
      bundle: p.bundle ? { id: p.bundle.id, name: p.bundle.name } : null,
      rate: p.rate,
      currency: p.currency,
      status: p.status
    };
  });
};
