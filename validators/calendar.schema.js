// validators/calendar.schema.js
const Joi = require('joi');

const base = {
  title: Joi.string().trim().max(150).allow('', null),
  description: Joi.string().allow('', null),
  type: Joi.string().valid('session', 'exam', 'target', 'other').default('session'),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  locationType: Joi.string().valid('online', 'in-person').allow(null),
  locationDetails: Joi.string().trim().max(300).allow('', null),
  subjectId: Joi.string().uuid().allow(null),
  purchaseId: Joi.string().uuid().allow(null),

  // One of these can be omitted based on caller role; service will fill/validate.
  studentId: Joi.string().uuid().optional(),
  tutorId: Joi.string().uuid().optional()
};

const createEvent = Joi.object(base).custom((val, helpers) => {
  if (new Date(val.endAt) <= new Date(val.startAt)) {
    return helpers.error('any.invalid', { message: 'endAt must be after startAt' });
  }
  return val;
}, 'time ordering');

const listQuery = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  studentId: Joi.string().uuid().optional(), // admin can filter
  tutorId: Joi.string().uuid().optional(),
  status: Joi.string().valid('proposed', 'accepted', 'rejected', 'cancelled', 'rescheduled').optional()
});

const reasonBody = Joi.object({
  reason: Joi.string().trim().min(3).max(500).required()
});

const rescheduleBody = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  note: Joi.string().trim().max(500).allow('', null)
}).custom((val, helpers) => {
  if (new Date(val.endAt) <= new Date(val.startAt)) {
    return helpers.error('any.invalid', { message: 'endAt must be after startAt' });
  }
  return val;
}, 'time ordering');

const idParam = Joi.object({ id: Joi.string().uuid().required() });

module.exports = { createEvent, listQuery, reasonBody, rescheduleBody, idParam };
