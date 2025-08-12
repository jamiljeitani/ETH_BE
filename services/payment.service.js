// services/payment.service.js
const dayjs = require('dayjs');
const { sequelize, Purchase, PaymentTransaction, Bundle, BundleItem, SessionType, User } = require('../models');
const { purchaseConfirmationEmail, pendingReviewEmail } = require('../utils/emailTemplates');
const { sendVerifyEmail } = require('./email.service'); // we can reuse safeSend for all emails

const OFFLINE_METHODS = new Set(['omt', 'whish', 'suyool', 'wu']);
const CARD_METHODS = new Set(['visa', 'mastercard']);

async function confirmPayment(studentId, purchaseId, { method, reference, receiptUrl, amount, currency }) {
  return sequelize.transaction(async (t) => {
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [
        { model: Bundle, as: 'bundle', include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }] },
        { model: SessionType, as: 'sessionType' },
        { association: 'student' }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!purchase || purchase.studentId !== studentId) {
      const e = new Error('Purchase not found'); e.status = 404; throw e;
    }

    // Persist a transaction record
    const tx = await PaymentTransaction.create({
      purchaseId,
      method,
      amount: amount ?? purchase.amount,
      currency: currency ?? purchase.currency,
      status: 'pending',
      reference: reference || null,
      receiptUrl: receiptUrl || null
    }, { transaction: t });

    // Simulate processor outcomes:
    if (CARD_METHODS.has(method)) {
      // accept immediately in dev
      await tx.update({ status: 'succeeded', processedAt: new Date() }, { transaction: t });
      await purchase.update({ status: 'active' }, { transaction: t });

      // send purchase confirmation email
      const mail = purchaseConfirmationEmail({ purchase });
      // reusing sendVerifyEmail as safe mail sender (same transport)
      await sendVerifyEmail(purchase.student.email, mail.subject, mail.html);

      return { purchase, transaction: tx };
    }

    if (OFFLINE_METHODS.has(method)) {
      // mark manual review
      await tx.update({ status: 'manual_review', processedAt: new Date() }, { transaction: t });
      await purchase.update({ status: 'pending_review' }, { transaction: t });

      // notify student we received the request and will review
      const mail = pendingReviewEmail({ purchase });
      await sendVerifyEmail(purchase.student.email, mail.subject, mail.html);

      return { purchase, transaction: tx };
    }

    // If unknown method
    await tx.update({ status: 'failed', processedAt: new Date() }, { transaction: t });
    const e = new Error('Unsupported payment method'); e.status = 400; throw e;
  });
}

module.exports = { confirmPayment };
