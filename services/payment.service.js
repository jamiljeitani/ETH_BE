// services/payment.service.js
const dayjs = require('dayjs');
const cfg = require('../config/env');
const stripe = cfg.stripe?.secret ? require('stripe')(cfg.stripe.secret) : null;

const {
  sequelize,
  Purchase,
  PaymentTransaction,
  Bundle,
  BundleItem,
  SessionType,
  User
} = require('../models');

const {
  purchaseConfirmationEmail,
  pendingReviewEmail
} = require('../utils/emailTemplates');

const { sendGenericEmail } = require('./email.service');

// Offline/card (sim) sets
const OFFLINE_METHODS = new Set(['omt', 'whish', 'suyool', 'wu']);
const CARD_METHODS = new Set(['visa', 'mastercard']);

/**
 * Compute a title/description from a purchase for Stripe line item.
 */
function describePurchaseForStripe(purchase) {
  if (purchase.bundle) {
    const name = `Bundle: ${purchase.bundle.name}`;
    const desc = (purchase.bundle.items || [])
      .map(it => `${it.hours}h ${it.sessionType?.name || 'Session'}`)
      .join(' + ');
    return { name, description: desc || 'Tutoring bundle' };
  }
  if (purchase.sessionType) {
    const name = `Session: ${purchase.sessionType.name}`;
    const desc = `${purchase.hoursPurchased}h @ ${purchase.sessionType.hourlyRate}/h`;
    return { name, description: desc };
  }
  return { name: 'Tutoring Purchase', description: '' };
}

/**
 * Create Stripe Checkout for a pending Purchase.
 */
async function createStripeCheckout(userId, purchaseId) {
  if (!stripe) {
    const e = new Error('Stripe not configured');
    e.status = 500; throw e;
  }

  const purchase = await Purchase.findByPk(purchaseId, {
    include: [
      { model: Bundle, as: 'bundle', include: [{ model: BundleItem, as: 'items', include: [{ model: SessionType, as: 'sessionType' }] }] },
      { model: SessionType, as: 'sessionType' },
      { association: 'student' }
    ]
  });
  if (!purchase || purchase.studentId !== userId) {
    const e = new Error('Purchase not found'); e.status = 404; throw e;
  }
  if (purchase.status !== 'pending') {
    const e = new Error('Purchase not payable'); e.status = 400; throw e;
  }

  const { name, description } = describePurchaseForStripe(purchase);
  const currency = String(purchase.currency || 'USD').toLowerCase();
  const unitAmount = Math.round(Number(purchase.amount) * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: purchase.student?.email || undefined,
    line_items: [{
      price_data: {
        currency,
        unit_amount: unitAmount,
        product_data: { name, description }
      },
      quantity: 1
    }],
    success_url: cfg.stripe.successUrl,
    cancel_url: cfg.stripe.cancelUrl,
    metadata: {
      purchaseId: purchase.id,
      studentId: purchase.studentId
    }
  });

  // Record a pending PaymentTransaction for Stripe
  const tx = await PaymentTransaction.create({
    purchaseId: purchase.id,
    method: 'stripe',
    amount: purchase.amount,
    currency: purchase.currency,
    status: 'pending',
    reference: null,
    receiptUrl: null,
    stripeSessionId: session.id
  });

  return { url: session.url, sessionId: session.id, transactionId: tx.id };
}

/**
 * Handle Stripe webhooks.
 * app.js mounts express.raw(...) for: POST /api/v1/payments/stripe/webhook
 */
async function handleStripeWebhook(req) {
  if (!stripe || !cfg.stripe.webhookSecret) {
    const e = new Error('Stripe webhook not configured');
    e.status = 500; throw e;
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, cfg.stripe.webhookSecret);
  } catch (err) {
    err.status = 400;
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent;

      // Find our tx by session id
      const tx = await PaymentTransaction.findOne({ where: { stripeSessionId: sessionId } });
      if (!tx) break;

      // Update tx + purchase
      await sequelize.transaction(async (t) => {
        await tx.update({
          status: 'succeeded',
          processedAt: new Date(),
          stripePaymentIntentId: paymentIntentId || null
        }, { transaction: t });

        const purchase = await Purchase.findByPk(tx.purchaseId, {
          include: [{ association: 'student' }],
          transaction: t,
          lock: t.LOCK.UPDATE
        });
        if (purchase && purchase.status === 'pending') {
          await purchase.update({ status: 'active' }, { transaction: t });

          // email student
          const mail = require('../utils/emailTemplates').purchaseConfirmationEmail({ purchase });
          await sendGenericEmail(purchase.student.email, mail.subject, mail.html);
        }
      });

      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object;
      const sessionId = session.id;
      const tx = await PaymentTransaction.findOne({ where: { stripeSessionId: sessionId } });
      if (tx && tx.status === 'pending') {
        await tx.update({ status: 'failed', processedAt: new Date() });
      }
      break;
    }

    default:
      // no-op for now
      break;
  }

  return { received: true };
}

/**
 * Existing confirmPayment for non-Stripe methods (dev sims/offline).
 */
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

    const tx = await PaymentTransaction.create({
      purchaseId,
      method,
      amount: amount ?? purchase.amount,
      currency: currency ?? purchase.currency,
      status: 'pending',
      reference: reference || null,
      receiptUrl: receiptUrl || null
    }, { transaction: t });

    if (CARD_METHODS.has(method)) {
      await tx.update({ status: 'succeeded', processedAt: new Date() }, { transaction: t });
      await purchase.update({ status: 'active' }, { transaction: t });

      const mail = require('../utils/emailTemplates').purchaseConfirmationEmail({ purchase });
      await sendGenericEmail(purchase.student.email, mail.subject, mail.html);

      return { purchase, transaction: tx };
    }

    if (OFFLINE_METHODS.has(method)) {
      await tx.update({ status: 'manual_review', processedAt: new Date() }, { transaction: t });
      await purchase.update({ status: 'pending_review' }, { transaction: t });

      const mail = require('../utils/emailTemplates').pendingReviewEmail({ purchase });
      await sendGenericEmail(purchase.student.email, mail.subject, mail.html);

      return { purchase, transaction: tx };
    }

    await tx.update({ status: 'failed', processedAt: new Date() }, { transaction: t });
    const e = new Error('Unsupported payment method'); e.status = 400; throw e;
  });
}

module.exports = {
  // Stripe
  createStripeCheckout,
  handleStripeWebhook,
  // Existing (non-Stripe)
  confirmPayment
};
