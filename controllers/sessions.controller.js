// server/controllers/sessions.controller.js
const svc = require('../services/session.service');

exports.start = async (req, res, next) => {
  try {
    const session = await svc.start(req.user.id, req.body);
    res.status(201).json({ session });
  } catch (e) { next(e); }
};

exports.pause = async (req, res, next) => {
  try {
    const out = await svc.pause(req.user.id, req.params.id);
    res.json(out);
  } catch (e) { next(e); }
};

exports.resume = async (req, res, next) => {
  try {
    const out = await svc.resume(req.user.id, req.params.id);
    res.json(out);
  } catch (e) { next(e); }
};

exports.end = async (req, res, next) => {
  try {
    const out = await svc.end(req.user.id, req.params.id);
    res.json(out);
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const session = await svc.getMine(req.user, req.params.id);
    res.json({ session });
  } catch (e) { next(e); }
};

// NEW: /sessions/my  (list my sessions with minutes & earnings, both live and completed)
exports.listMine = async (req, res, next) => {
  try {
    const data = await svc.listMine(req.user, req.query);
    res.json(data); // { rows: [...] }
  } catch (e) { next(e); }
};

// NEW: /sessions/assigned-purchases  (for the tutor dropdown)
exports.assigned = async (req, res, next) => {
  try {
    const data = await svc.listAssignedPurchases(req.user);
    res.json({ purchases: data });
  } catch (e) { next(e); }
};
