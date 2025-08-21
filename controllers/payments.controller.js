// controllers/payments.controller.js
const paymentService = require('../services/payment.service');

// Non-Stripe (existing dev/offline)
async function confirm(req, res, next) {
  try {
    const { purchaseId } = req.params;
    const result = await paymentService.confirmPayment(req.user.id, purchaseId, req.body);
    res.json({ ...result, message: 'Payment recorded.' });
  } catch (e) { next(e); }
}

// Stripe: create checkout session
async function stripeCheckout(req, res, next) {
  try {
    const { purchaseId } = req.body;
    const { url, sessionId, transactionId } =
      await paymentService.createStripeCheckout(req.user.id, purchaseId);
    res.json({ url, sessionId, transactionId });
  } catch (e) { next(e); }
}

// Stripe: webhook (raw body handled in app.js)
async function stripeWebhook(req, res, next) {
  try {
    await paymentService.handleStripeWebhook(req);
    res.json({ received: true });
  } catch (e) { next(e); }
}

module.exports = { confirm, stripeCheckout, stripeWebhook };
