// validators/student.schema.js
const Joi = require('joi');

const putMe = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required(),
  guardianName: Joi.string().trim().min(2).max(150).required(),
  guardianPhone: Joi.string().trim().min(7).max(25).required(),
  phone: Joi.string().trim().min(7).max(25).allow('', null),
  dob: Joi.date().iso().required(),
  address: Joi.string().trim().min(3).max(200).required(),
  school: Joi.string().trim().min(2).max(150).required(),
  gradeId: Joi.string().uuid().required(),
  languageIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  subjectIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  bacTypeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  profilePictureUrl: Joi.string().uri().required(),
  notes: Joi.string().allow('', null)
});

const createTutorChangeRequest = Joi.object({
  purchaseId: Joi.string().uuid().required(),
  reason: Joi.string().trim().min(5).max(1000).required()
});

module.exports = { putMe, createTutorChangeRequest };
