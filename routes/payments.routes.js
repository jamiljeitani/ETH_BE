// routes/payments.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/payment.schema');

// NOTE: If your /payments router is not already protected in routes/index.js,
// you can add JWT here, e.g.:
// const { authMiddleware } = require('../middlewares/auth.middleware');
// router.use(authMiddleware);

// Non-Stripe (visa/mastercard simulation + offline confirmation)
router.post(
  '/:purchaseId/confirm',
  validate(schema.idParam, 'params'),
  validate(schema.confirmPayment),
  ctrl.confirm
);

// Stripe: create checkout session for a purchase
router.post(
  '/stripe/checkout',
  validate(schema.stripeCheckout),
  ctrl.stripeCheckout
);

// Webhook is mounted in app.js as raw body, do NOT JSON parse there.

module.exports = router;
