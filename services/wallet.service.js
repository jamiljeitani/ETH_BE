// services/wallet.service.js
const { sequelize, TutorProfile, User, WalletTransaction } = require('../models');

const OFFLINE_METHODS = new Set(['omt', 'whish', 'suyool', 'wu', 'wired_transfer']);
function toAmount(n) { return Number.parseFloat(Number(n || 0).toFixed(2)); }

async function getTutorWallet(tutorId) {
  const user = await User.findByPk(tutorId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return { walletAmount: Number(user.wallet_balance || 0) };
}

// Tutor creates a withdrawal request (deduct immediately, status=pending)
async function createWithdrawRequest(tutorId, { amount, method, note = null, currency = 'USD', phoneNumber = null, iban = null }) {
  if (!OFFLINE_METHODS.has(String(method))) {
    const e = new Error('Unsupported payout method'); e.status = 400; throw e;
  }
  const amt = toAmount(amount);
  if (!(amt > 0)) { const e = new Error('Amount must be > 0'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(tutorId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

    const current = Number(user.wallet_balance || 0);
    if (amt > current) { const e = new Error('Amount exceeds wallet balance'); e.status = 400; throw e; }

        // Validate payout details: phone for non-wired, IBAN for wired_transfer
    if (String(method) === 'wired_transfer') {
      if (!iban || String(iban).trim().length < 8) { const e = new Error('IBAN is required for wired_transfer'); e.status = 400; throw e; }
    } else {
      if (!phoneNumber || String(phoneNumber).trim().length < 6) { const e = new Error('Phone number is required for this payout method'); e.status = 400; throw e; }
    }

    const tx = await WalletTransaction.create({
      user_id: tutorId,
      tutorId, method, amount: amt, currency, status: 'pending', note, requestedBy: tutorId, phoneNumber, iban,
      type: 'withdrawal',
      balance_after: current - amt
    }, { transaction: t });

    await user.update({ wallet_balance: sequelize.literal(`COALESCE("wallet_balance",0) - ${amt.toFixed(2)}`) }, { transaction: t });

    const updated = await user.reload({ transaction: t });
    return { transaction: tx, walletAmount: Number(updated.wallet_balance || 0) };
  });
}

async function listMyWithdrawRequests(tutorId, { limit = 50, offset = 0 } = {}) {
  const rows = await WalletTransaction.findAll({
    where: { 
      tutorId,
      type: 'withdrawal' // Only show manual withdrawal requests
    },
    order: [['createdAt','DESC']],
    limit: Math.min(200, Number(limit)||50),
    offset: Number(offset)||0
  });
  return rows;
}

// Admin
// services/wallet.service.js
async function adminListWithdrawRequests({ status = null, tutorId = null, limit = 50, offset = 0 } = {}) {
    const where = {};
    if (status) where.status = status;
    if (tutorId) where.tutorId = tutorId;

    const rows = await WalletTransaction.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: Math.min(200, Number(limit) || 50),
        offset: Number(offset) || 0,
        include: [
            {
                model: TutorProfile,
                as: 'tutorProfile',
                attributes: ['fullName'],
            },
        ],
    });

    // flatten tutor name into each row for convenience
    return rows.map(r => {
        const j = r.toJSON();
        j.tutorName = j.tutorProfile?.fullName || null;
        delete j.tutorProfile;
        return j;
    });
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

    const user = await User.findByPk(tx.tutorId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

    // Update withdrawal request status
    await tx.update({ status: 'cancelled', processedBy: adminId, processedAt: new Date() }, { transaction: t });
    
    // Restore wallet balance
    await user.update({ wallet_balance: sequelize.literal(`COALESCE("wallet_balance",0) + ${Number(tx.amount).toFixed(2)}`) }, { transaction: t });

    const updated = await user.reload({ transaction: t });
    
    // Create a transaction record for the cancellation/restoration
    await WalletTransaction.create({
      user_id: tx.tutorId,
      tutorId: tx.tutorId, // For backward compatibility
      amount: Number(tx.amount),
      type: 'withdrawal_cancellation',
      reference_id: txId,
      description: 'Withdrawal request cancelled - balance restored',
      balance_after: Number(updated.wallet_balance || 0)
    }, { transaction: t });

    return { transaction: tx, walletAmount: Number(updated.wallet_balance || 0) };
  });
}

// General wallet operations for cancellation policy
async function addToWallet(userId, amount, transactionData) {
  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) { 
      const e = new Error('User not found'); 
      e.status = 404; 
      throw e; 
    }
    
    const currentBalance = Number(user.wallet_balance || 0);
    const newBalance = currentBalance + Number(amount);
    
    // Update user wallet balance
    await user.update({ wallet_balance: newBalance }, { transaction: t });
    
    // Create transaction record
    const transaction = await WalletTransaction.create({
      user_id: userId,
      tutorId: userId, // For backward compatibility with existing withdrawal system
      amount: Math.abs(Number(amount)),
      type: transactionData.type,
      reference_id: transactionData.referenceId,
      description: transactionData.description,
      balance_after: newBalance
    }, { transaction: t });
    
    return { newBalance };
  });
}

async function deductFromWallet(userId, amount, transactionData) {
  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!user) { 
      const e = new Error('User not found'); 
      e.status = 404; 
      throw e; 
    }
    
    const currentBalance = Number(user.wallet_balance || 0);
    const newBalance = currentBalance - Number(amount);
    
    // Allow negative balance for tutors (when allowNegative is true)
    if (!transactionData.allowNegative && newBalance < 0) {
      const e = new Error('Insufficient wallet balance');
      e.status = 400;
      throw e;
    }
    
    // Update user wallet balance
    await user.update({ wallet_balance: newBalance }, { transaction: t });
    
    // Create transaction record
    const transaction = await WalletTransaction.create({
      user_id: userId,
      tutorId: userId, // For backward compatibility with existing withdrawal system
      amount: -Math.abs(Number(amount)),
      type: transactionData.type,
      reference_id: transactionData.referenceId,
      description: transactionData.description,
      balance_after: newBalance
    }, { transaction: t });
    
    return { newBalance };
  });
}

async function getUserWallet(userId) {
  const user = await User.findByPk(userId);
  if (!user) { 
    const e = new Error('User not found'); 
    e.status = 404; 
    throw e; 
  }
  return { walletAmount: Number(user.wallet_balance || 0) };
}

async function getUserWalletTransactions(userId, { limit = 50, offset = 0 } = {}) {
  const rows = await WalletTransaction.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']],
    limit: Math.min(200, Number(limit) || 50),
    offset: Number(offset) || 0
  });
  return rows;
}

module.exports = {
  getTutorWallet,
  createWithdrawRequest,
  listMyWithdrawRequests,
  adminListWithdrawRequests,
  adminMarkPaid,
  adminCancelRequest,
  // New general wallet operations
  addToWallet,
  deductFromWallet,
  getUserWallet,
  getUserWalletTransactions
};
