// services/wallet.service.js
const { sequelize, TutorProfile, User, WalletTransaction } = require('../models');
const { ROLES } = require('../utils/constants');
const { Op } = require('sequelize');

const OFFLINE_METHODS = new Set(['omt', 'whish', 'suyool', 'wu', 'wired_transfer']);

function toAmount(n) { return Number.parseFloat(Number(n || 0).toFixed(2)); }

async function getTutorWallet(tutorId) {
  const tp = await TutorProfile.findOne({ where: { userId: tutorId } });
  if (!tp) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }
  return { walletAmount: Number(tp.walletAmount || 0) };
}

async function withdraw(adminId, tutorId, { amount, method, currency = 'USD', note = null }) {
  if (!OFFLINE_METHODS.has(String(method))) {
    const e = new Error('Unsupported payout method'); e.status = 400; throw e;
  }
  const amt = toAmount(amount);
  if (!(amt > 0)) { const e = new Error('Amount must be > 0'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    const tutor = await User.findByPk(tutorId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tutor || tutor.role !== 'tutor') { const e = new Error('Tutor not found'); e.status = 404; throw e; }

    const tp = await TutorProfile.findOne({ where: { userId: tutorId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!tp) { const e = new Error('Tutor profile not found'); e.status = 404; throw e; }

    const current = Number(tp.walletAmount || 0);
    if (amt > current) { const e = new Error('Insufficient wallet balance'); e.status = 400; throw e; }

    const tx = await WalletTransaction.create({
      tutorId, method, amount: amt, currency, status: 'approved', note, createdBy: adminId, processedAt: new Date()
    }, { transaction: t });

    await tp.update({ walletAmount: sequelize.literal(`COALESCE("walletAmount",0) - ${amt.toFixed(2)}`) }, { transaction: t });

    const updated = await tp.reload({ transaction: t });
    return { transaction: tx, walletAmount: Number(updated.walletAmount || 0) };
  });
}

module.exports = { getTutorWallet, withdraw };
