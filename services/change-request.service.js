// services/change-request.service.js
const { sequelize, TutorChangeRequest, Purchase, User, TutorProfile } = require('../models');
const { changeRequestReceivedEmail, changeRequestDecisionEmail } = require('../utils/emailTemplates');
const { sendVerifyEmail } = require('./email.service');

async function createRequest(studentId, { purchaseId, reason }) {
  return sequelize.transaction(async (t) => {
    // 1. Validate purchase exists and belongs to student
    const purchase = await Purchase.findByPk(purchaseId, { 
      include: [{ association: 'student' }], 
      transaction: t 
    });
    if (!purchase || purchase.studentId !== studentId) {
      const e = new Error('Purchase not found or access denied'); e.status = 404; throw e;
    }
    
    // 2. Check if purchase is active
    if (purchase.status !== 'active') {
      const e = new Error('Can only request tutor change for active purchases'); e.status = 400; throw e;
    }
    
    // 3. Check if there's already a pending request
    const existingRequest = await TutorChangeRequest.findOne({
      where: { purchaseId, status: 'pending' },
      transaction: t
    });
    if (existingRequest) {
      const e = new Error('Change request already pending for this purchase'); e.status = 400; throw e;
    }

    // 4. Create the request
    const req = await TutorChangeRequest.create({ 
      studentId, 
      purchaseId, 
      currentTutorId: purchase.assignedTutorId,
      reason, 
      status: 'pending' 
    }, { transaction: t });

    // 5. Send confirmation email to student
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
  if (status && status !== 'all') where.status = status;
  
  return TutorChangeRequest.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { 
        association: 'purchase',
        include: [
          { 
            association: 'student', 
            attributes: ['id', 'email'],
            include: [
              { 
                model: require('../models').StudentProfile, 
                as: 'studentProfile', 
                attributes: ['fullName'],
                required: false 
              }
            ]
          },
          { 
            association: 'assignedTutor', 
            attributes: ['id', 'email'],
            include: [
              { 
                model: TutorProfile, 
                as: 'tutorProfile', 
                attributes: ['fullName'],
                required: false 
              }
            ]
          }
        ]
      },
      { 
        association: 'student', 
        attributes: ['id', 'email'],
        include: [
          { 
            model: require('../models').StudentProfile, 
            as: 'studentProfile', 
            attributes: ['fullName'],
            required: false 
          }
        ]
      },
      { 
        association: 'currentTutor', 
        attributes: ['id', 'email'],
        include: [
          { 
            model: TutorProfile, 
            as: 'tutorProfile', 
            attributes: ['fullName'],
            required: false 
          }
        ]
      },
      { 
        association: 'handledByUser', 
        attributes: ['id', 'email'],
        include: [
          { 
            model: require('../models').StudentProfile, 
            as: 'studentProfile', 
            attributes: ['fullName'],
            required: false 
          },
          { 
            model: TutorProfile, 
            as: 'tutorProfile', 
            attributes: ['fullName'],
            required: false 
          }
        ]
      }
    ]
  });
}

async function approveRequest(adminId, id, note) {
  return sequelize.transaction(async (t) => {
    // First, lock the main record without includes to avoid FOR UPDATE on outer joins
    const rec = await TutorChangeRequest.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!rec) { const e = new Error('Change request not found'); e.status = 404; throw e; }
    if (rec.status !== 'pending') { const e = new Error('Request already processed'); e.status = 400; throw e; }

    // Then fetch the related data without locking
    const recWithIncludes = await TutorChangeRequest.findByPk(id, {
      include: [
        { association: 'purchase', include: [{ association: 'student' }] }, 
        { association: 'student' }
      ],
      transaction: t
    });

    await rec.update({ 
      status: 'approved', 
      handledBy: adminId, 
      handledAt: new Date(), 
      approvalNote: note || null 
    }, { transaction: t });

    // TODO: Implement tutor reassignment logic here
    // This depends on your tutor assignment system

    // notify student
    const mail = changeRequestDecisionEmail({ 
      purchase: recWithIncludes.purchase, 
      decision: 'approved', 
      resolutionNote: note || null 
    });
    await sendVerifyEmail(recWithIncludes.student.email, mail.subject, mail.html);

    return rec;
  });
}

async function rejectRequest(adminId, id, reason) {
  return sequelize.transaction(async (t) => {
    // First, lock the main record without includes to avoid FOR UPDATE on outer joins
    const rec = await TutorChangeRequest.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!rec) { const e = new Error('Change request not found'); e.status = 404; throw e; }
    if (rec.status !== 'pending') { const e = new Error('Request already processed'); e.status = 400; throw e; }

    // Then fetch the related data without locking
    const recWithIncludes = await TutorChangeRequest.findByPk(id, {
      include: [
        { association: 'purchase', include: [{ association: 'student' }] }, 
        { association: 'student' }
      ],
      transaction: t
    });

    await rec.update({ 
      status: 'rejected', 
      handledBy: adminId, 
      handledAt: new Date(), 
      rejectionReason: reason || null 
    }, { transaction: t });

    // notify student
    const mail = changeRequestDecisionEmail({ 
      purchase: recWithIncludes.purchase, 
      decision: 'rejected', 
      resolutionNote: reason || null 
    });
    await sendVerifyEmail(recWithIncludes.student.email, mail.subject, mail.html);

    return rec;
  });
}

module.exports = { createRequest, listMyRequests, listAll, approveRequest, rejectRequest };
