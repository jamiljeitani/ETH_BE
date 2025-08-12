// services/feedback.service.js
const { Op } = require('sequelize');
const { Feedback, Session, User } = require('../models');

async function create(user, { sessionId, metrics, comment }) {
  const session = await Session.findByPk(sessionId);
  if (!session) { const e = new Error('Session not found'); e.status = 404; throw e; }
  const isStudent = user.role === 'student' && session.studentId === user.id;
  const isTutor = user.role === 'tutor' && session.tutorId === user.id;
  if (!isStudent && !isTutor && user.role !== 'admin') { const e = new Error('Forbidden'); e.status = 403; throw e; }
  if (session.status !== 'completed') { const e = new Error('Feedback allowed only after session completion'); e.status = 400; throw e; }

  const byRole = isStudent ? 'student' : (isTutor ? 'tutor' : 'student'); // admin posting on behalf? keep 'student' by default
  const rec = await Feedback.create({
    sessionId,
    byUserId: user.id,
    byRole,
    metrics: metrics || null,
    comment: comment || null
  });

  return rec;
}

async function listForAdmin(query) {
  const where = {};
  if (query.from) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(query.from) };
  if (query.to)   where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(query.to) };

  const results = await Feedback.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      {
        association: 'session',
        include: [
          { association: 'student', attributes: ['id', 'email'] },
          { association: 'tutor', attributes: ['id', 'email'] }
        ]
      },
      { association: 'byUser', attributes: ['id', 'email', 'role'] }
    ]
  });

  // optional filters by related ids
  return results.filter(rec => {
    const s = rec.session;
    if (!s) return false;
    if (query.sessionId && s.id !== query.sessionId) return false;
    if (query.studentId && s.studentId !== query.studentId) return false;
    if (query.tutorId && s.tutorId !== query.tutorId) return false;
    return true;
  });
}

module.exports = { create, listForAdmin };
