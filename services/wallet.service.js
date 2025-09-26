// services/wallet.service.js
const { sequelize, TutorProfile, User, WalletTransaction } = require('../models');

const OFFLINE_METHODS = new Set(['omt', 'whish', 'suyool', 'wu', 'wired_transfer']);
function toAmount(n) { return Number.parseFloat(Number(n || 0).toFixed(2)); }

async function getTutorWallet(tutorId) {
  const tp = await TutorProfile.findOne({ where: { userId: tutorId } });
  if (!tp) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }
  return { walletAmount: Number(tp.walletAmount || 0) };
}

// Tutor creates a withdrawal request (deduct immediately, status=pending)
async function createWithdrawRequest(tutorId, { amount, method, note = null, currency = 'USD' }) {
  if (!OFFLINE_METHODS.has(String(method))) {
    const e = new Error('Unsupported payout method'); e.status = 400; throw e;
  }
  const amt = toAmount(amount);
  if (!(amt > 0)) { const e = new Error('Amount must be > 0'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    const tp = await TutorProfile.findOne({ where: { userId: tutorId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!tp) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }

    const current = Number(tp.walletAmount || 0);
    if (amt > current) { const e = new Error('Amount exceeds wallet balance'); e.status = 400; throw e; }

    const tx = await WalletTransaction.create({
      tutorId, method, amount: amt, currency, status: 'pending', note, requestedBy: tutorId
    }, { transaction: t });

    await tp.update({ walletAmount: sequelize.literal(`COALESCE("walletAmount",0) - ${amt.toFixed(2)}`) }, { transaction: t });

    const updated = await tp.reload({ transaction: t });
    return { transaction: tx, walletAmount: Number(updated.walletAmount || 0) };
  });
}

async function listMyWithdrawRequests(tutorId, { limit = 50, offset = 0 } = {}) {
  const rows = await WalletTransaction.findAll({
    where: { tutorId },
    order: [['createdAt','DESC']],
    limit: Math.min(200, Number(limit)||50),
    offset: Number(offset)||0
  });
  return rows;
}

// Admin
async function adminListWithdrawRequests({ status = null, tutorId = null, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (tutorId) where.tutorId = tutorId;
  const rows = await WalletTransaction.findAll({
    where, order: [['createdAt','DESC']],
    limit: Math.min(200, Number(limit)||50),
    offset: Number(offset)||0
  });
  return rows;
}

async function adminMarkPaid(adminId, txId) {
  return sequelize.transaction(async (t) => {
    const tx = await WalletTransaction.findByPk(txId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tx) { const e = new Error('Request not found'); e.status = 404; throw e; }
    if (tx.status !== 'pending') { const e = new Error('Request already processed'); e.status = 400; throw e; }

    await tx.update({ status: 'paid', processedBy: adminId, processedAt: new Date() }, { transaction: t });
    return tx;
  });
}

async function adminCancelRequest(adminId, txId) {
  return sequelize.transaction(async (t) => {
    const tx = await WalletTransaction.findByPk(txId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tx) { const e = new Error('Request not found'); e.status = 404; throw e; }
    if (tx.status !== 'pending') { const e = new Error('Request already processed'); e.status = 400; throw e; }

    const tp = await TutorProfile.findOne({ where: { userId: tx.tutorId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!tp) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }

    await tx.update({ status: 'cancelled', processedBy: adminId, processedAt: new Date() }, { transaction: t });
    await tp.update({ walletAmount: sequelize.literal(`COALESCE("walletAmount",0) + ${Number(tx.amount).toFixed(2)}`) }, { transaction: t });

    const updated = await tp.reload({ transaction: t });
    return { transaction: tx, walletAmount: Number(updated.walletAmount || 0) };
  });
}

module.exports = {
  getTutorWallet,
  createWithdrawRequest,
  listMyWithdrawRequests,
  adminListWithdrawRequests,
  adminMarkPaid,
  adminCancelRequest
};
