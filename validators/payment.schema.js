// validators/payment.schema.js
const Joi = require('joi');

const idParam = Joi.object({ purchaseId: Joi.string().uuid().required() });

const confirmPayment = Joi.object({
  method: Joi.string().valid('visa', 'mastercard', 'omt', 'whish', 'suyool', 'wu').required(),
  reference: Joi.string().trim().min(1).max(100).optional(),
  receiptUrl: Joi.string().uri().optional(),
  amount: Joi.number().precision(2).positive().optional(),
  currency: Joi.string().trim().max(10).optional()
});

// Stripe checkout creation
const stripeCheckout = Joi.object({
  purchaseId: Joi.string().uuid().required()
});

module.exports = { idParam, confirmPayment, stripeCheckout };
