// controllers/students.controller.js
const studentSvc = require('../services/student.service');
const changeSvc = require('../services/change-request.service');

async function getMe(req, res, next) {
  try { const profile = await studentSvc.getMe(req.user.id); res.json({ profile }); }
  catch (e) { next(e); }
}
async function putMe(req, res, next) {
  try { const profile = await studentSvc.upsertMe(req.user.id, req.body); res.json({ profile, message: 'Student profile saved.' }); }
  catch (e) { next(e); }
}

async function createTutorChangeRequest(req, res, next) {
  try {
    const rec = await changeSvc.createRequest(req.user.id, req.body);
    res.status(201).json({ request: rec, message: 'Your request was submitted.' });
  } catch (e) { next(e); }
}
async function listMyTutorChangeRequests(req, res, next) {
  try {
    const recs = await changeSvc.listMyRequests(req.user.id);
    res.json({ requests: recs });
  } catch (e) { next(e); }
}

module.exports = { getMe, putMe, createTutorChangeRequest, listMyTutorChangeRequests };
