// controllers/tutors.controller.js
const svc = require('../services/tutor.service');
const path = require('path');
const fs = require('fs').promises;

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

/** NEW: list students assigned to the logged-in tutor */
async function listAssignedStudents(req, res, next) {
  try {
    const students = await svc.listAssignedStudents(req.user.id);
    res.json({ students });
  } catch (e) { next(e); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const profile = await svc.updateAvatar(req.user.id, avatarUrl); // ✅ use svc
    res.json({ profile, avatarUrl, message: 'Avatar uploaded successfully' });
  } catch (e) {
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch {}
    }
    next(e);
  }
}

async function uploadIdDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const documentUrl = `/uploads/documents/${req.file.filename}`;
    const profile = await svc.updateIdDocument(req.user.id, documentUrl); // ✅ use svc
    res.json({ profile, documentUrl, message: 'ID document uploaded successfully' });
  } catch (e) {
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch {}
    }
    next(e);
  }
}

module.exports = { getMe, putMe, listAssignedStudents, uploadAvatar, uploadIdDocument };
