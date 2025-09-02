// controllers/students.controller.js
const studentSvc = require('../services/student.service');
const changeSvc = require('../services/change-request.service');
const path = require('path');
const fs = require('fs').promises;

async function getMe(req, res, next) {
  try { const profile = await studentSvc.getMe(req.user.id); res.json({ profile }); }
  catch (e) { next(e); }
}
async function putMe(req, res, next) {
  try { const profile = await studentSvc.upsertMe(req.user.id, req.body); res.json({ profile, message: 'Student profile saved.' }); }
  catch (e) { next(e); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }

    // Create the avatar URL (relative path for serving)
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update the student profile with the new avatar URL
    const profile = await studentSvc.updateAvatar(req.user.id, avatarUrl);

    res.json({
      profile,
      avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (e) {
    // Clean up uploaded file if database update fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }
    next(e);
  }
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

module.exports = { getMe, putMe, uploadAvatar, createTutorChangeRequest, listMyTutorChangeRequests };
