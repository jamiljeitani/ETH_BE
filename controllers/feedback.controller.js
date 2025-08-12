// controllers/feedback.controller.js
const svc = require('../services/feedback.service');

async function create(req, res, next) {
  try {
    const rec = await svc.create(req.user, req.body);
    res.status(201).json({ feedback: rec, message: 'Feedback recorded.' });
  } catch (e) { next(e); }
}

module.exports = { create };
