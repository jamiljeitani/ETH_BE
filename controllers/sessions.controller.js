// controllers/sessions.controller.js
const svc = require('../services/session.service');

async function start(req, res, next) {
  try {
    const data = await svc.start(req.user.id, req.body);
    res.status(201).json({ session: data, message: 'Session started.' });
  } catch (e) { next(e); }
}
async function pause(req, res, next) {
  try {
    const data = await svc.pause(req.user.id, req.params.id);
    res.json({ ...data, message: 'Session paused.' });
  } catch (e) { next(e); }
}
async function resume(req, res, next) {
  try {
    const data = await svc.resume(req.user.id, req.params.id);
    res.json({ ...data, message: 'Session resumed.' });
  } catch (e) { next(e); }
}
async function end(req, res, next) {
  try {
    const data = await svc.end(req.user.id, req.params.id);
    res.json({ ...data, message: 'Session ended.' });
  } catch (e) { next(e); }
}
async function getOne(req, res, next) {
  try {
    const data = await svc.getMine(req.user, req.params.id);
    res.json({ session: data });
  } catch (e) { next(e); }
}

module.exports = { start, pause, resume, end, getOne };
