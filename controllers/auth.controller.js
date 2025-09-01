// controllers/auth.controller.js
const authService = require('../services/auth.service');

async function signup(req, res, next) {
  try {
    const user = await authService.signup(req.body);
    res.status(201).json({ user, message: 'Signup successful. Please verify your email.' });
  } catch (e) { next(e); }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    const user = await authService.verifyEmail({ token });
    res.json({ user, message: 'Email verified.' });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    res.json(data);
  } catch (e) { next(e); }
}

async function refresh(req, res, next) {
  try {
    const data = await authService.refresh(req.body);
    res.json(data);
  } catch (e) { next(e); }
}

async function forgot(req, res, next) {
  try {
    await authService.forgotPassword(req.body);
    res.json({ message: 'If this email exists, a reset token was sent.' });
  } catch (e) { next(e); }
}

async function reset(req, res, next) {
  try {
    const user = await authService.resetPassword(req.body);
    res.json({ user, message: 'Password reset successful.' });
  } catch (e) { next(e); }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { signup, verifyEmail, login, refresh, forgot, reset, me };
