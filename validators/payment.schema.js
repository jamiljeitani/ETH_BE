// validators/payment.schema.js
const Joi = require('joi');

// Regex helpers
const phoneRe = /^\+?[0-9]{7,15}$/;                // simple intl phone
const ibanRe  = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i; // generic IBAN format

// Params
const idParam = Joi.object({ purchaseId: Joi.string().uuid().required() });

// Student confirm payment
const confirmPayment = Joi.object({
    // NOTE: 'wired_transfer' is the wire method key (keep consistent across backend)
    method: Joi.string().valid('visa', 'mastercard', 'omt', 'whish', 'suyool', 'wu', 'wired_transfer').required(),
    amount: Joi.number().precision(2).positive().optional(),
    currency: Joi.string().trim().max(10).optional(),

    // Phone required for agent/cash methods
    payerPhone: Joi.string().pattern(phoneRe)
        .when('method', {
            is: Joi.valid('omt','whish','suyool','wu'),
            then: Joi.required(),
            otherwise: Joi.forbidden()
        }),

    // IBAN required for wired transfer
    iban: Joi.string().pattern(ibanRe)
        .when('method', {
            is: 'wired_transfer',
            then: Joi.required(),
            otherwise: Joi.forbidden()
        })
});

// Stripe checkout creation
const stripeCheckout = Joi.object({
    purchaseId: Joi.string().uuid().required()
});

// Admin: list manual review payments
const adminListQuery = Joi.object({
    status: Joi.string().valid('manual_review').default('manual_review').optional(),
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional()
});

// Admin: decision on a manual review transaction
const adminDecisionParams = Joi.object({
    transactionId: Joi.string().uuid().required()
});

const adminDecisionBody = Joi.object({
    note: Joi.string().trim().max(500).allow('', null).optional()
});

// Single export
module.exports = {
    idParam,
    confirmPayment,
    stripeCheckout,
    adminListQuery,
    adminDecisionParams,
    adminDecisionBody
};
