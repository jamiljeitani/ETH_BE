// validators/admin.schema.js
const Joi = require('joi');

// Params
const idParam = Joi.object({ id: Joi.string().uuid().required() });

// Simple name entities (Subject, Grade)
const nameCreate = Joi.object({ name: Joi.string().trim().min(2).max(120).required() });
const nameUpdate = Joi.object({ name: Joi.string().trim().min(2).max(120).optional() });

// Language
const createLanguage = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  code: Joi.string().trim().min(2).max(10).optional()
});
const updateLanguage = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  code: Joi.string().trim().min(2).max(10).optional()
});

// Tutor Rank
const createTutorRank = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  order: Joi.number().integer().min(1).required()
});
const updateTutorRank = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  order: Joi.number().integer().min(1).optional()
});

// SessionType (exposed as "sessions")
const createSessionType = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  hourlyRate: Joi.number().precision(2).positive().required(),
  sessionHours: Joi.number().integer().min(1).max(40).optional(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional()
});
const updateSessionType = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  hourlyRate: Joi.number().precision(2).positive().optional(),
  sessionHours: Joi.number().integer().min(1).max(40).optional(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional()
});

// ---- FIX: BacType (allow description) ----
const createBacType = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().allow('', null).optional()
});
const updateBacType = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().allow('', null).optional()
});

// Bundles
const bundleItem = Joi.object({
  sessionTypeId: Joi.string().uuid().required(),
  hours: Joi.number().integer().min(1).required()
});
const createBundle = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional(),
  items: Joi.array().items(bundleItem).min(1).required()
});
const updateBundle = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional(),
  items: Joi.array().items(bundleItem).min(1).optional()
});

// Assignments
const createAssignment = Joi.object({
  studentId: Joi.string().uuid().required(),
  tutorId: Joi.string().uuid().required(),
  purchaseId: Joi.string().uuid().required(),
  notes: Joi.string().max(300).allow('', null)
});
const queryAssignments = Joi.object({
  studentId: Joi.string().uuid().optional(),
  tutorId: Joi.string().uuid().optional(),
  purchaseId: Joi.string().uuid().optional()
});
const updateAssignment = Joi.object({
  tutorId: Joi.string().uuid().optional(),
  notes: Joi.string().max(300).allow('', null)
});

// Change Requests
const decisionChangeRequest = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  resolutionNote: Joi.string().max(500).allow('', null)
});
const idParamChangeReq = Joi.object({
  id: Joi.string().uuid().required()
});

// Admin feedback list query
const feedbackListQuery = Joi.object({
  sessionId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
  tutorId: Joi.string().uuid().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional()
});

// Optional: export aliases so admin.routes.js keys stay strict
const createSession = createSessionType;
const updateSession = updateSessionType;

module.exports = {
  idParam,

  // simple name entities (no description): Subject, Grade
  createSubject: nameCreate, updateSubject: nameUpdate,
  createGrade: nameCreate,   updateGrade: nameUpdate,

  // ---- BacType with description ----
  createBacType, updateBacType,

  // language & rank
  createLanguage, updateLanguage,
  createTutorRank, updateTutorRank,

  // sessions & bundles
  createSessionType, updateSessionType,
  createSession, updateSession, // aliases for routes that use these keys
  createBundle, updateBundle,

  // assignments & change requests
  createAssignment, updateAssignment, queryAssignments,
  decisionChangeRequest, idParamChangeReq,

  // feedback
  feedbackListQuery
};
