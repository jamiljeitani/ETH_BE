// validators/purchase.schema.js
const Joi = require('joi');

const createPurchase = Joi.object({
  // Either bundleId OR (sessionTypeId + hours)
  bundleId: Joi.string().uuid(),
  sessionTypeId: Joi.string().uuid(),
  hours: Joi.number().integer().min(1),
  startDate: Joi.date().iso().required(), // 24h rule enforced in service
  currency: Joi.string().trim().max(10).default('USD')
}).xor('bundleId', 'sessionTypeId');

module.exports = { createPurchase };
