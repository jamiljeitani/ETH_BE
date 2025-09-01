// validators/auth.schema.js
const Joi = require('joi');

const passwordPattern = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$');

const signup = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordPattern).required()
    .messages({ 'string.pattern.base': 'Password must be 8+ chars with upper, lower, number, special.' }),
  role: Joi.string().valid('student', 'tutor').required()
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const verifyEmail = Joi.object({
  token: Joi.string().min(10).required()
});

const forgot = Joi.object({
  email: Joi.string().email().required()
});

const reset = Joi.object({
  token: Joi.string().min(10).required(),
  newPassword: Joi.string().pattern(passwordPattern).required()
    .messages({ 'string.pattern.base': 'Password must be 8+ chars with upper, lower, number, special.' })
});

const refresh = Joi.object({
  refreshToken: Joi.string().min(10).required()
});

const updatePreferences = Joi.object({
  preferredLanguage: Joi.string().valid('en', 'fr', 'ar').required()
});

module.exports = { signup, login, verifyEmail, forgot, reset, refresh, updatePreferences };
