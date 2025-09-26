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
            { model: SessionType, as: 'sessionType', required: false, attributes: ['id','name','sessionHours'] },
            { model: Bundle, as: 'bundle', required: false, include: [
                    { model: BundleItem, as: 'items', include: [
                            { model: SessionType, as: 'sessionType', attributes: ['id','name','sessionHours'] }
                        ] }
                ]
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    const items = purchases.map(p => {
        const isBundle = Array.isArray(p.bundle?.items) && p.bundle.items.length > 0;

        // Sum minutes from consumptions if present (works for bundles & sessions)
        const sumConsumedFromRows = Array.isArray(p.consumptions)
            ? p.consumptions.reduce((s, c) => s + Number(c.minutes || 0), 0)
            : 0;

        let purchasedMinutes = 0;
        let consumedMinutes  = 0;
        let sessionsRemaining = 0;

        if (isBundle) {
            // bundle_items.hours == sessionNumber
            purchasedMinutes = p.bundle.items.reduce((sum, it) => {
                const sessionCount = Number(it?.hours || 0); // sessionNumber
                const stH = Number(it?.sessionType?.sessionHours);
                const perSessionMin = Number.isFinite(stH) && stH > 0 ? stH * 60 : 60;
                return sum + (sessionCount * perSessionMin);
            }, 0);

            // For bundles, prefer explicit consumptions
            consumedMinutes = sumConsumedFromRows || Number(p.minutesConsumed || 0);

            sessionsRemaining = Math.floor(Math.max(0, purchasedMinutes - consumedMinutes) / 60);
        } else {
            const purchased = toInt(p.sessionsPurchased);
            const consumedSessions = toDec(p.sessionsConsumed); // can be fractional
            const stH = Number(p.sessionType?.sessionHours);
            const perSessionMin = Number.isFinite(stH) && stH > 0 ? stH * 60 : 60;

            purchasedMinutes = purchased * perSessionMin;

            // Prefer sessionsConsumed * perSessionMin; if missing, fall back to summed consumptions
            const consumedFromSessions = Number(consumedSessions) * perSessionMin;
            consumedMinutes = Number.isFinite(consumedFromSessions) && consumedFromSessions > 0
                ? Math.round(consumedFromSessions)
                : sumConsumedFromRows;

            sessionsRemaining = Math.max(0, purchased - Number(consumedSessions || 0));
        }

        const remainingMinutes = Math.max(0, purchasedMinutes - consumedMinutes);

        return {
            id: p.id,
            status: p.status,

            // Keep these fields for compatibility (only meaningful for single-session purchases)
            sessionsPurchased: toInt(p.sessionsPurchased),
            sessionsConsumed:  toDec(p.sessionsConsumed),
            sessionsRemaining,

            purchasedMinutes,
            consumedMinutes,
            remainingMinutes,

            sessionType: p.sessionType
                ? { id: p.sessionType.id, name: p.sessionType.name, sessionHours: p.sessionType.sessionHours }
                : null,

            bundle: p.bundle ? {
                id: p.bundle.id,
                name: p.bundle.name,
                items: (p.bundle.items || []).map(i => ({
                    id: i.id,
                    sessionTypeId: i.sessionTypeId,
                    // hours is actually number of sessions in this item
                    sessionNumber: toInt(i.hours),
                    sessionTypeHours: i.sessionType?.sessionHours ?? null,
                    sessionTypeName:  i.sessionType?.name ?? null
                }))
            } : null,

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