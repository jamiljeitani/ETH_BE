// validators/tutor.schema.js
const Joi = require('joi');

const putMe = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string().trim().min(7).max(25).allow('', null), // optional
  dob: Joi.date().iso().required(),
  address: Joi.string().trim().min(3).max(200).required(),
  educationLevel: Joi.string().trim().min(2).max(150).required(),
  availabilityHoursPerWeek: Joi.number().integer().min(1).max(80).required(),
  tutoringType: Joi.string().valid('online', 'in-person', 'hybrid').required(),
  payoutMethod: Joi.string().trim().min(2).max(50).required(),

  // rankId: Joi.string().uuid().required(),
  // commented for testing
  idDocumentUrl: Joi.string().uri().required(),
  profilePictureUrl: Joi.string().uri().required(),
  preferredGradesText: Joi.string().max(200).allow('', null),

  languageIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  subjectIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  bacTypeIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

module.exports = { putMe };
