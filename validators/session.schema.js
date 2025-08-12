// validators/session.schema.js
const Joi = require('joi');

const start = Joi.object({
  purchaseId: Joi.string().uuid().required(),
  calendarEventId: Joi.string().uuid().allow(null),
  subjectId: Joi.string().uuid().allow(null),
  deliveryMode: Joi.string().valid('online', 'in-person').allow(null),
  notes: Joi.string().max(500).allow('', null)
});

const idParam = Joi.object({ id: Joi.string().uuid().required() });

module.exports = { start, idParam };
