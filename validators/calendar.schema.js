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

const urlField = Joi.string().uri({ allowRelative: false }).max(2048);

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

  // 🔗 Optional meeting link; accept either key from the FE
  meetingUrl: urlField.optional().allow(null, ''),
  meetingLink: urlField.optional().allow(null, ''),

  // role-derived:
  studentId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
  tutorId: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
}).unknown(false);

const reasonBody = Joi.object({
  reason: Joi.string().allow(null, '').optional(),
  // New cancellation policy fields
  charged: Joi.boolean().optional(),
  hoursUntilSession: Joi.number().min(0).optional(),
  cancelledBy: Joi.string().valid('student', 'tutor').optional(),
  cancelledById: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
  sessionCost: Joi.number().min(0).optional(),
  applyWalletPolicy: Joi.boolean().optional(),
}).unknown(false);

const rescheduleBody = Joi.object({
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  note: Joi.string().allow(null, '').optional(),

  // allow updating the link on reschedule
  meetingUrl: urlField.optional().allow(null, ''),
  meetingLink: urlField.optional().allow(null, ''),
}).unknown(false);

// validators/calendar.js
const createRecurring = Joi.object({
    // one-off template
    title: Joi.string().allow('', null),
    description: Joi.string().allow('', null),

    subjectId: Joi.string().guid({ version: 'uuidv4' }).allow(null),
    purchaseId: Joi.string().guid({ version: 'uuidv4' }).required(),

    // timing
    startAt: Joi.date().iso().required(),                       // first occurrence
    durationMinutes: Joi.number().integer().min(15).max(240).required(),

    // recurrence
    count: Joi.number().integer().min(1).max(300).required(),   // total occurrences
    freq: Joi.string().valid('once','daily','weekly').default('weekly'),
    backToBack: Joi.number().integer().min(1).max(24).default(1),

    // parity with single-create
    type: Joi.string().valid('session','exam','target').default('session'),
    locationType: Joi.string().valid('online','in-person').allow(null),
    locationDetails: Joi.string().allow('', null),
    meetingUrl: Joi.string().uri().allow('', null),
    meetingLink: Joi.string().uri().allow('', null),

    // tutor may target a student explicitly
    studentId: Joi.string().guid({ version: 'uuidv4' }).allow(null),
}).unknown(false);


module.exports = {
  idParam,
  listQuery,
  createEvent,
  reasonBody,
  rescheduleBody,
  createRecurring
};
