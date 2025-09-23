// validators/calendar.schema.js
const Joi = require('joi');

const idParam = Joi.object({
  id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required(),
});

const listQuery = Joi.object({
  role: Joi.string().valid('student', 'tutor', 'admin').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  studentId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
  tutorId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
}).unknown(false);

const createEvent = Joi.object({
  title: Joi.string().allow(null, '').optional(),
  description: Joi.string().allow(null, '').optional(),
  type: Joi.string().valid('session', 'exam', 'target').default('session'),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  locationType: Joi.string().valid('online', 'in-person').optional(),
  locationDetails: Joi.string().allow(null, '').optional(),
  subjectId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).allow(null).optional(),
  purchaseId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).allow(null).optional(),
  // role-derived:
  studentId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
  tutorId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
}).unknown(false);

const reasonBody = Joi.object({
  reason: Joi.string().allow(null, '').optional(),
}).unknown(false);

const rescheduleBody = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  note: Joi.string().allow(null, '').optional(),
}).unknown(false);

const createRecurring = Joi.object({
    // one-off event template
    title: Joi.string().allow('', null),
    description: Joi.string().allow('', null),
    subjectId: Joi.string().guid({ version: 'uuidv4' }).allow(null),
    purchaseId: Joi.string().guid({ version: 'uuidv4' }).required(),

    // recurrence inputs
    startAt: Joi.date().iso().required(),        // first occurrence start
    durationMinutes: Joi.number().integer().min(15).max(240).required(),
    count: Joi.number().integer().min(1).max(30).required(),   // e.g., 5
    // weekly by default; if you want more later, extend with 'freq', 'interval'
}).unknown(false);


module.exports = {
  idParam,
  listQuery,
  createEvent,
  reasonBody,
  rescheduleBody,
  createRecurring
};
