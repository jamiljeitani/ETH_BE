// server/services/session.service.js
const { Op } = require('sequelize');
const {
  sequelize, User, Purchase, Assignment, Session, SessionTiming, Consumption, Timesheet, SessionType, StudentProfile
} = require('../models');
const { maybeSendCompletionFeedbackEmails } = require('./completion-feedback.service');

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
  const hours = Number(purchase.sessionsPurchased || 0);
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

    // Close any open timing segment
    const open = await SessionTiming.findOne({
        where: { sessionId: id, endedAt: { [Op.is]: null } },
        order: [['createdAt', 'DESC']],
        transaction: t, lock: t.LOCK.UPDATE
    });
    if (open) {
        const endAt = new Date();
        const minutes = ceilMinutes(endAt - new Date(open.startedAt));
        await open.update({ endedAt: endAt, minutes }, { transaction: t });
    }

    // Recompute worked minutes (this session)
    const segs = await SessionTiming.findAll({ where: { sessionId: id }, transaction: t });
    const totalMinutes = segs.reduce((sum, x) => sum + (x.minutes || 0), 0);

    // 1) Lock only the purchase row (no include to avoid FOR UPDATE on outer join)
    let purchase = await Purchase.findByPk(s.purchaseId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!purchase) { const e = new Error('Purchase not found'); e.status = 404; throw e; }

    // 2) Reload associations without lock (safe read of sessionType)
    purchase = await purchase.reload({
        transaction: t,
        include: [{
            association: 'bundle',
            include: [
                { association: 'items', include: [{ association: 'sessionType' }] }
            ]
        },{
            association: 'sessionType',
            attributes: ['id', 'name', 'sessionHours'] // we rely on sessionHours here
        }],
    });

    const isBundle = Array.isArray(purchase?.bundle?.items) && purchase.bundle.items.length > 0;

    let perSessionMin = 60;
    if(isBundle) {
        perSessionMin = purchase.bundle.items.reduce((sum, it) => {
            const sessionCount = Number(it?.hours || 0); // actually "sessionNumber"
            const stH = Number(it?.sessionType?.sessionHours);
            const perSessionMin = Number.isFinite(stH) && stH > 0 ? stH * 60 : 60;
            return sum + (sessionCount * perSessionMin);
        }, 0);
    }
    else {
         perSessionMin = (Number.isFinite(Number(purchase?.sessionType?.sessionHours)) && Number(purchase?.sessionType?.sessionHours) > 0
            ? Number(purchase?.sessionType?.sessionHours) * 60
            : 60);
    }

    // Balances (all in minutes); using sessionsConsumed as the source
    const totalBalMin       = Number(purchase.sessionsPurchased || 0) * perSessionMin;
    const consumedMinBefore = Number(purchase.sessionsConsumed || 0) * perSessionMin;
    const remainingMinBefore = Math.max(0, totalBalMin - consumedMinBefore);

    // Cap billable by: worked minutes, remaining balance, and the per-session cap
    const billable = Math.min(totalMinutes, remainingMinBefore, perSessionMin);

    // Track overage only for auditing (worked beyond per-session cap)
    const overage = Math.max(0, totalMinutes - perSessionMin);

    const consumedMinAfter  = consumedMinBefore + billable;
    const remainingMinAfter = Math.max(0, totalBalMin - consumedMinAfter);

    // Update purchase: sessionsConsumed as fractional (requires DECIMAL/NUMERIC column)
    const updates = {};
    if ('sessionsConsumed' in Purchase.rawAttributes || 'sessionsConsumed' in purchase) {
        const sessionsFromMinutes = perSessionMin > 0 ? (consumedMinAfter / perSessionMin) : 0;
        updates.sessionsConsumed = Number(sessionsFromMinutes.toFixed(2));
    }
    if (Object.keys(updates).length) {
        await purchase.update(updates, { transaction: t });
    }

    maybeSendCompletionFeedbackEmails({ purchaseId: purchase.id, sessionId: s.id })
        .catch(err => console.warn('Feedback email send failed:', err && err.message));

    // Record consumption
    await Consumption.create({
        purchaseId: purchase.id,
        sessionId: s.id,
        minutes: Math.trunc(billable),                // keep minutes as int too if needed
        balanceBeforeMinutes: Math.trunc(remainingMinBefore),
        balanceAfterMinutes: Math.trunc(remainingMinAfter)
    }, { transaction: t });


    // Money: pay only for capped billable minutes (e.g., at most 60 if type is 60)
    const rateHr = await effectiveRatePerHour(purchase, t);
    const amount = (billable / 60) * Number(rateHr);

    const moneyPayload = {};
    if ('rate' in Timesheet.rawAttributes) {
        moneyPayload.rate = isIntCol(Timesheet,'rate') ? toCents(rateHr) : Number(rateHr);
    }
    if ('amount' in Timesheet.rawAttributes) {
        moneyPayload.amount = isIntCol(Timesheet,'amount')
            ? toCents(amount)
            : Number(amount.toFixed(2));
    }

    await Timesheet.create({
        tutorId: s.tutorId,
        studentId: s.studentId,
        sessionId: s.id,
        minutes: Math.ceil(billable),               // minutes you paid for
        currency: purchase.currency || 'USD',
        status: 'pending',
        ...moneyPayload
    }, { transaction: t });
    // Update tutor wallet (increment by payable amount)
    try {
        const { TutorProfile } = require('../models');
        const tp = await TutorProfile.findOne({ where: { userId: s.tutorId }, transaction: t, lock: t.LOCK.UPDATE });
        if (tp) {
            await tp.update({ walletAmount: sequelize.literal(`COALESCE("walletAmount",0) + ${Number(amount).toFixed(2)}`) }, { transaction: t });
        }
    } catch (e) {
        // Non-fatal: log and continue (wallet can be reconciled later)
        console.warn('Wallet update failed:', e?.message || e);
    }


    await s.update(
        { status: 'completed', endedAt: new Date(), totalMinutes, overageMinutes: overage },
        { transaction: t }
    );

    return {
        sessionId: s.id,
        billableMinutes:  Math.ceil(billable),      // <= at most perSessionMin
        overageMinutes:  Math.ceil(billable),        // worked beyond per-session cap
        ratePerHour: Number(rateHr),
        amount: Number(amount.toFixed(2))
    };
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
    include: [{ association: 'purchase',
        include: [
            { association: 'sessionType' }
        ] }, { association: 'timings' }, { association: 'timesheets' }, { association: 'student',include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName']}] }],
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

    rows.push({
      sessionId: s.id,
      status: s.status,
      purchaseTitle: s.purchase?.sessionType?.name + "(" + s.purchase?.sessionsPurchased + ")",
      studentName: s.student?.studentProfile?.fullName || s.student?.email || 'Student',
      minutes,
      rate: rateOut,
      amount: s?.timesheets?.amount ?? 0,
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
        include: [{
            association: 'purchase',
            include: [
                {
                    association: 'bundle',
                    include: [
                        { association: 'items', include: [{ association: 'sessionType' }] }
                    ]
                },
                { association: 'student', include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName'] }] },
                { association: 'sessionType' }, // for single-session purchases
            ],
        }],
        order: [['createdAt', 'DESC']],
        subQuery: false,
        distinct: true,
    });

    return assigns.map(a => {
        const p = a.purchase || {};
        const isBundle = Array.isArray(p?.bundle?.items) && p.bundle.items.length > 0;

        let totalMin = 0;
        let consumedMin = 0;
        let minutesRemaining = 0;
        let sessionsRemaining = 0.0000;

        if (isBundle) {
            // bundle_items.hours === sessionNumber
            totalMin = p.bundle.items.reduce((sum, it) => {
                const sessionCount = Number(it?.hours || 0); // actually "sessionNumber"
                const stH = Number(it?.sessionType?.sessionHours);
                const perSessionMin = Number.isFinite(stH) && stH > 0 ? stH * 60 : 60;
                return sum + (sessionCount * perSessionMin);
            }, 0);

            const purchased = Number(p?.sessionsPurchased || 0);
            const consumed  = Number(p?.sessionsConsumed  || 0);

            totalMin    = purchased * totalMin;
            consumedMin = consumed  * totalMin / purchased; // proportional consumption
            minutesRemaining = Math.max(0, totalMin - consumedMin);

            // Coarse session count for UI filtering (bundles mix types)
            sessionsRemaining = Math.floor(minutesRemaining / 60);
        } else {
            const stH = Number(p?.sessionType?.sessionHours);
            const perSessionMin = Number.isFinite(stH) && stH > 0 ? stH * 60 : 60;

            const purchased = Number(p?.sessionsPurchased || 0);
            const consumed  = Number(p?.sessionsConsumed  || 0);

            // Exact formula you requested
            totalMin    = purchased * perSessionMin;
            consumedMin = consumed  * perSessionMin;

            minutesRemaining = Math.max(0, totalMin - consumedMin);
            const decDiff = (a, b, scale = 3) => {
                const m = Math.pow(10, scale);
                const A = Math.round(a * m);
                const B = Math.round(b * m);
                return (A - B) / m;
            };

            sessionsRemaining = Number.isFinite(purchased) && Number.isFinite(consumed)
                ? Math.max(0, decDiff(purchased, consumed, 3)) // 20 - 19.800 = 0.2
                : (perSessionMin > 0 ? Math.floor(minutesRemaining / perSessionMin) : 0);
        }

        const displayName = p.bundle?.name
            ? `${p.bundle.name} • ${p?.tutor?.fullName || 'Tutor'}`
            : `${p?.sessionType?.name || 'Session'}(${p?.sessionsPurchased ?? '-'}) • ${p.student?.studentProfile?.fullName || 'Student'}`;

        return {
            id: p.id,
            displayName,
            minutesRemaining,
            sessionsRemaining,
            student: p.student ? { id: p.student.id, name: p.student.name } : null,
            bundle: p.bundle ? { id: p.bundle.id, name: p.bundle.name } : null,
            rate: p.rate,
            currency: p.currency,
            status: p.status
        };
    }).filter(item => item.sessionsRemaining > 0);
};
