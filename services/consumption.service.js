// services/consumption.service.js
const { Op } = require('sequelize');
const {
  sequelize, Purchase, Consumption, Session, SessionType, Bundle, BundleItem
} = require('../models');

function toInt(n) { return Math.max(0, parseInt(n, 10) || 0); }
function toDec(n) { return Number.parseFloat(Number(n || 0).toFixed(4)); }
function toSafeNumber(n) { return Number(n || 0); }

async function listStudentPurchasesWithConsumption(studentId) {
  const purchases = await Purchase.findAll({
    where: { studentId, status: { [Op.in]: ['active'] } },
    include: [
      { model: Consumption, as: 'consumptions', required: false },
      { model: SessionType, as: 'sessionType', required: false },
      { model: Bundle, as: 'bundle', required: false, include: [{ model: BundleItem, as: 'items' }] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const items = purchases.map(p => {
    const purchasedHours = toInt(p.sessionsPurchased);
    const consumedHours = toDec(p.sessionsConsumed);
    const remainingHours = Math.max(0, purchasedHours - consumedHours);
    const consumedMinutes = Math.round(consumedHours * 60);
    const purchasedMinutes = purchasedHours * 60;
    const remainingMinutes = Math.max(0, purchasedMinutes - consumedMinutes);

    return {
      id: p.id,
      status: p.status,
      sessionsPurchased: purchasedHours,
      sessionsConsumed: consumedHours,
      sessionsRemaining: remainingHours,
      purchasedMinutes,
      consumedMinutes,
      remainingMinutes,
      sessionType: p.sessionType ? { id: p.sessionType.id, name: p.sessionType.name } : null,
      bundle: p.bundle ? { id: p.bundle.id, name: p.bundle.name, items: p.bundle.items?.map(i => ({
        id: i.id, sessionTypeId: i.sessionTypeId, hours: toInt(i.hours)
      })) || [] } : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  });

  const totals = items.reduce((acc, it) => {
    acc.purchasedMinutes += it.purchasedMinutes;
    acc.consumedMinutes  += it.consumedMinutes;
    acc.remainingMinutes += it.remainingMinutes;
    return acc;
  }, { purchasedMinutes: 0, consumedMinutes: 0, remainingMinutes: 0 });

  return { items, totals };
}

async function listStudentConsumptionHistory(studentId, { purchaseId, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (purchaseId) where.purchaseId = purchaseId;

  // join through session to ensure ownership by student
  const rows = await Consumption.findAll({
    include: [
      { model: Session, as: 'session', where: { studentId }, required: true }
    ],
    where,
    order: [['createdAt','DESC']],
    limit: Math.min(200, Number(limit) || 50),
    offset: Number(offset) || 0
  });

  return rows.map(c => ({
    id: c.id,
    purchaseId: c.purchaseId,
    sessionId: c.sessionId,
    minutes: c.minutes,
    balanceBeforeMinutes: c.balanceBeforeMinutes,
    balanceAfterMinutes: c.balanceAfterMinutes,
    createdAt: c.createdAt
  }));
}

module.exports = {
  listStudentPurchasesWithConsumption,
  listStudentConsumptionHistory
};