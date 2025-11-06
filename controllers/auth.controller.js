// controllers/auth.controller.js
const authService = require("../services/auth.service");

async function signup(req, res, next) {
  try {
    const user = await authService.signup(req.body);
    res
      .status(201)
      .json({ user, message: "Signup successful. Please verify your email." });
  } catch (e) {
    next(e);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const user = await authService.verifyEmail({ token });
    res.json({ user, message: "Email verified." });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function refresh(req, res, next) {
  try {
    const data = await authService.refresh(req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

async function forgot(req, res, next) {
  try {
    await authService.forgotPassword(req.body);
    res.json({ message: "If this email exists, a reset token was sent." });
  } catch (e) {
    next(e);
  }
}

async function reset(req, res, next) {
  try {
    const user = await authService.resetPassword(req.body);
    res.json({ user, message: "Password reset successful." });
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);
    // Prevent caching to ensure fresh user data
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json({ user });
  } catch (e) {
    next(e);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const user = await authService.updateUserPreferences(req.user.id, req.body);
    // Prevent caching to ensure fresh data
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json({ user, message: "Preferences updated successfully." });
  } catch (e) {
    next(e);
  }
}

async function getPreferences(req, res, next) {
  try {
    const preferences = await authService.getUserPreferences(req.user.id);
    res.json({ preferences });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  signup,
  verifyEmail,
  login,
  refresh,
  forgot,
  reset,
  me,
  updatePreferences,
  getPreferences,
};
