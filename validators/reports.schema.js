// validators/reports.schema.js
const Joi = require('joi');

const base = {
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
};

const consumptionQuery = Joi.object({
  ...base,
  studentId: Joi.string().uuid().optional(),
  tutorId: Joi.string().uuid().optional()
});

const payoutsQuery = Joi.object({
  ...base,
  tutorId: Joi.string().uuid().optional(),
  status: Joi.string().valid('pending', 'approved', 'paid').optional()
});

module.exports = { consumptionQuery, payoutsQuery };
