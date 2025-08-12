// services/change-request.service.js
const { sequelize, TutorChangeRequest, Purchase } = require('../models');
const { changeRequestReceivedEmail, changeRequestDecisionEmail } = require('../utils/emailTemplates');
const { sendVerifyEmail } = require('./email.service');

async function createRequest(studentId, { purchaseId, reason }) {
  return sequelize.transaction(async (t) => {
    const purchase = await Purchase.findByPk(purchaseId, { include: [{ association: 'student' }], transaction: t });
    if (!purchase || purchase.studentId !== studentId) {
      const e = new Error('Purchase not found'); e.status = 404; throw e;
    }

    const req = await TutorChangeRequest.create({ studentId, purchaseId, reason, status: 'pending' }, { transaction: t });

    // email back to student (confirmation)
    const mail = changeRequestReceivedEmail({ purchase, reason });
    await sendVerifyEmail(purchase.student.email, mail.subject, mail.html);

    return req;
  });
}

async function listMyRequests(studentId) {
  return TutorChangeRequest.findAll({
    where: { studentId },
    order: [['createdAt', 'DESC']]
  });
}

async function listAll(status) {
  const where = {};
  if (status) where.status = status;
  return TutorChangeRequest.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [{ association: 'purchase' }, { association: 'student', attributes: ['id', 'email'] }]
  });
}

async function decide(adminId, id, { action, resolutionNote }) {
  return sequelize.transaction(async (t) => {
    const rec = await TutorChangeRequest.findByPk(id, {
      include: [{ association: 'purchase', include: [{ association: 'student' }] }, { association: 'student' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!rec) { const e = new Error('Not found'); e.status = 404; throw e; }
    if (rec.status !== 'pending') { const e = new Error('Already decided'); e.status = 400; throw e; }

    const status = action === 'approve' ? 'approved' : 'rejected';
    await rec.update({ status, handledBy: adminId, handledAt: new Date(), resolutionNote: resolutionNote || null }, { transaction: t });

    // notify student
    const mail = changeRequestDecisionEmail({ purchase: rec.purchase, decision: status, resolutionNote: rec.resolutionNote });
    await sendVerifyEmail(rec.student.email, mail.subject, mail.html);

    return rec;
  });
}

module.exports = { createRequest, listMyRequests, listAll, decide };
