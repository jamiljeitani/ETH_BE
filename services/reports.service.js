// services/reports.service.js
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Purchase,
  Consumption,
  Timesheet,
  Assignment,
  Bundle,
  SessionType
} = require('../models');

function toDateRange({ from, to }) {
  const where = {};
  if (from) where[Op.gte] = new Date(from);
  if (to) where[Op.lte] = new Date(to);
  return Object.keys(where).length ? where : null;
}

function paginate({ page = 1, limit = 20 }) {
  const p = Number(page) || 1;
  const l = Number(limit) || 20;
  return { limit: l, offset: (p - 1) * l, page: p };
}

async function getConsumptionReport({ from, to, studentId, tutorId, page = 1, limit = 20 }) {
  const consRange = toDateRange({ from, to });
  const { offset, limit: lim, page: pg } = paginate({ page, limit });

  // Base filter on purchases
  const purchaseWhere = {};
  if (studentId) purchaseWhere.studentId = studentId;

  // Count first for meta
  const totalPurchases = await Purchase.count({ where: purchaseWhere });

  // Pull a page of purchases with relevant associations
  const purchases = await Purchase.findAll({
    where: purchaseWhere,
    order: [['createdAt', 'DESC']],
    limit: lim,
    offset,
    include: [
      { association: 'student', attributes: ['id', 'email'] },
      { association: 'bundle', attributes: ['id', 'name'] },
      { association: 'sessionType', attributes: ['id', 'name', 'hourlyRate'] },
      {
        association: 'assignment',
        include: [{ association: 'tutor', attributes: ['id', 'email'] }]
      }
    ]
  });

  // If filtering by tutor, we only keep purchases assigned to that tutor
  const filteredPurchases = tutorId
    ? purchases.filter(p => p.assignment && p.assignment.tutorId === tutorId)
    : purchases;

  // Compute period consumption per purchase, and aggregate by tutor
  const byTutorMap = new Map();
  const items = [];

  for (const p of filteredPurchases) {
    // Period minutes for this purchase
    const consWhere = { purchaseId: p.id };
    if (consRange) consWhere.createdAt = consRange;

    const periodMinutes = (await Consumption.sum('minutes', { where: consWhere })) || 0;

    // Overall/remaining from purchase cached fields
    const purchasedMinutesTotal = Number(p.sessionsPurchased) * 60;
    const consumedMinutesOverall = Number(p.sessionsConsumed) * 60;
    const remainingMinutes = Math.max(0, purchasedMinutesTotal - consumedMinutesOverall);

    // Tutor (from current assignment, one-per-purchase)
    const tutor = p.assignment?.tutor || null;
    const tutorIdEff = p.assignment?.tutorId || null;

    // Aggregate by tutor (period)
    if (tutorIdEff) {
      const agg = byTutorMap.get(tutorIdEff) || {
        tutorId: tutorIdEff,
        tutorEmail: tutor ? tutor.email : null,
        minutesPeriod: 0,
        purchases: 0
      };
      agg.minutesPeriod += periodMinutes;
      agg.purchases += 1;
      byTutorMap.set(tutorIdEff, agg);
    }

    items.push({
      purchaseId: p.id,
      createdAt: p.createdAt,
      status: p.status,
      currency: p.currency,
      student: p.student ? { id: p.student.id, email: p.student.email } : null,
      product: p.bundle
        ? { type: 'bundle', id: p.bundle.id, name: p.bundle.name }
        : { type: 'sessionType', id: p.sessionType?.id || null, name: p.sessionType?.name || null, hourlyRate: p.sessionType?.hourlyRate || null },
      sessionsPurchased: Number(p.sessionsPurchased),
      hoursConsumedOverall: Number(p.sessionsConsumed),
      purchasedMinutesTotal,
      consumedMinutesOverall,
      remainingMinutes,
      minutesPeriod: periodMinutes,
      tutor: tutor ? { id: tutor.id, email: tutor.email } : null
    });
  }

  // by-tutor rollup
  const byTutor = Array.from(byTutorMap.values()).map(x => ({
    ...x,
    hoursPeriod: Number((x.minutesPeriod / 60).toFixed(2))
  }));

  // Summary
  const totalPeriodMinutes = items.reduce((s, it) => s + it.minutesPeriod, 0);

  return {
    summary: {
      window: { from: from || null, to: to || null },
      totalPurchases,
      page: pg,
      limit: lim,
      count: items.length,
      totalPeriodMinutes,
      totalPeriodHours: Number((totalPeriodMinutes / 60).toFixed(2))
    },
    byTutor,
    purchases: items
  };
}

async function getPayoutsReport({ from, to, status, tutorId, page = 1, limit = 20 }) {
  const tsRange = toDateRange({ from, to });
  const where = {};
  if (tsRange) where.createdAt = tsRange;
  if (status) where.status = status;
  if (tutorId) where.tutorId = tutorId;

  const { offset, limit: lim, page: pg } = paginate({ page, limit });

  const totalRows = await Timesheet.count({ where });

  const rows = await Timesheet.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: lim,
    offset,
    include: [
      { association: 'tutor', attributes: ['id', 'email'] },
      { association: 'session', attributes: ['id', 'studentId', 'tutorId', 'startedAt', 'endedAt'] }
    ]
  });

  const byTutorMap = new Map();
  let totalAmount = 0;
  let totalMinutes = 0;

  for (const r of rows) {
    const key = r.tutorId;
    const agg = byTutorMap.get(key) || {
      tutorId: r.tutorId,
      tutorEmail: r.tutor ? r.tutor.email : null,
      minutes: 0,
      amount: 0,
      rows: 0,
      currency: r.currency
    };
    agg.minutes += Number(r.minutes);
    agg.amount += Number(r.amount);
    agg.rows += 1;
    byTutorMap.set(key, agg);

    totalAmount += Number(r.amount);
    totalMinutes += Number(r.minutes);
  }

  const byTutor = Array.from(byTutorMap.values()).map(x => ({
    ...x,
    hours: Number((x.minutes / 60).toFixed(2)),
    amount: Number(x.amount.toFixed(2))
  }));

  return {
    summary: {
      window: { from: from || null, to: to || null },
      status: status || 'any',
      totalRows,
      page: pg,
      limit: lim,
      count: rows.length,
      totalMinutes,
      totalHours: Number((totalMinutes / 60).toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2))
    },
    byTutor,
    rows
  };
}

module.exports = { getConsumptionReport, getPayoutsReport };
