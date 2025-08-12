// validators/feedback.schema.js
const Joi = require('joi');

const create = Joi.object({
  sessionId: Joi.string().uuid().required(),
  metrics: Joi.object().unknown(true).optional(), // any metric keys -> numbers 1..5 ideally (front-end enforced)
  comment: Joi.string().allow('', null)
});

module.exports = { create };
