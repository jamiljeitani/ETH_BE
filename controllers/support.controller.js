// controllers/support.controller.js
const { SupportMessage } = require('../models');

async function create(req, res, next) {
  try {
    const { subject, message } = req.body || {};
    if (!subject || !subject.trim() || !message || !message.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required' } });
    }

    const row = await SupportMessage.create({
      userId: req.user.id,
      role: req.user.role,
      subject: subject.trim(),
      message: message.trim(),
    });

    res.status(201).json({ message: 'Message sent', support: row });
  } catch (e) { next(e); }
}

async function mine(req, res, next) {
  try {
    const rows = await SupportMessage.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ support: rows });
  } catch (e) { next(e); }
}

// Admin endpoints (optional but handy)
async function listAll(req, res, next) {
  try {
    const { status, role } = req.query || {};
    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const rows = await SupportMessage.findAll({
      where,
      include: [{ association: 'user', attributes: ['id', 'email', 'role'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ support: rows });
  } catch (e) { next(e); }
}

async function reply(req, res, next) {
  try {
    const { id } = req.params;
    const { reply, status } = req.body || {};
    const row = await SupportMessage.findByPk(id);
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    if (reply !== undefined) row.reply = reply;
    if (status) row.status = status;
    await row.save();
    res.json({ message: 'Updated', support: row });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const row = await SupportMessage.findByPk(id);
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    await row.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
}

module.exports = { create, mine, listAll, reply, remove };
