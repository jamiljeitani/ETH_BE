// controllers/tutors.controller.js
const svc = require('../services/tutor.service');

async function getMe(req, res, next) {
  try {
    const profile = await svc.getMe(req.user.id);
    res.json({ profile });
  } catch (e) { next(e); }
}

async function putMe(req, res, next) {
  try {
    const profile = await svc.upsertMe(req.user.id, req.body);
    res.json({ profile, message: 'Tutor profile saved.' });
  } catch (e) { next(e); }
}

module.exports = { getMe, putMe };
