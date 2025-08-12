// utils/jwt.js
const jwt = require('jsonwebtoken');
const cfg = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, cfg.jwt.secret, { expiresIn: cfg.jwt.expiresIn });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, cfg.jwt.refreshSecret, { expiresIn: cfg.jwt.refreshExpiresIn });
}
function verifyAccessToken(token) {
  return jwt.verify(token, cfg.jwt.secret);
}
function verifyRefreshToken(token) {
  return jwt.verify(token, cfg.jwt.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
