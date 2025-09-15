// validators/admin.schema.js
const Joi = require('joi');

// Params
const idParam = Joi.object({ id: Joi.string().uuid().required() });


// Simple name entities (Subject, Grade, BacType)
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
  hoursPerWeek: Joi.number().integer().min(1).max(40).optional(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional()
});
const updateSessionType = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  hourlyRate: Joi.number().precision(2).positive().optional(),
  hoursPerWeek: Joi.number().integer().min(1).max(40).optional(),
  description: Joi.string().allow('', null).optional(),
  isActive: Joi.boolean().optional()
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
  items: Joi.array().items(bundleItem).min(1).optional() // replace if provided
});

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

const decisionChangeRequest = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  resolutionNote: Joi.string().max(500).allow('', null)
});

const idParamChangeReq = Joi.object({
  id: Joi.string().uuid().required()
});

// NEW: admin feedback list query
const feedbackListQuery = Joi.object({
  sessionId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
  tutorId: Joi.string().uuid().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional()
});


const updateAssignment = Joi.object({
  tutorId: Joi.string().uuid().optional(),
  notes: Joi.string().max(300).allow('', null),
});




module.exports = {
  idParam,
  // simple name entities
  createSubject: nameCreate, updateSubject: nameUpdate,
  createGrade: nameCreate,   updateGrade: nameUpdate,
  createBacType: nameCreate, updateBacType: nameUpdate,
  // language & rank
  createLanguage, updateLanguage,
  createTutorRank, updateTutorRank,
  // sessions & bundles
  createSessionType, updateSessionType,
  createBundle, updateBundle,
  // assignments & change requests
  createAssignment, updateAssignment, queryAssignments,
  decisionChangeRequest, idParamChangeReq,
  feedbackListQuery
};
