// services/assignment.service.js
const { sequelize, User, Purchase, Assignment } = require('../models');
const { assignmentStudentEmail, assignmentTutorEmail } = require('../utils/emailTemplates');
const { sendVerifyEmail } = require('./email.service');

async function createOrReplaceAssignment(adminId, { studentId, tutorId, purchaseId, notes }) {
  return sequelize.transaction(async (t) => {
    const [student, tutor, purchase] = await Promise.all([
      User.findByPk(studentId, { transaction: t }),
      User.findByPk(tutorId, { transaction: t }),
      Purchase.findByPk(purchaseId, { include: [{ association: 'student' }], transaction: t, lock: t.LOCK.UPDATE })
    ]);

    if (!student || student.role !== 'student') { const e = new Error('Invalid studentId'); e.status = 400; throw e; }
    if (!tutor || tutor.role !== 'tutor') { const e = new Error('Invalid tutorId'); e.status = 400; throw e; }
    if (!purchase || purchase.studentId !== studentId) { const e = new Error('Invalid purchaseId'); e.status = 400; throw e; }
    if (!['active'].includes(purchase.status)) { const e = new Error('Purchase must be active'); e.status = 400; throw e; }

    // upsert one-per-purchase
    let assignment = await Assignment.findOne({ where: { purchaseId }, transaction: t });
    if (!assignment) {
      assignment = await Assignment.create({ studentId, tutorId, purchaseId, assignedBy: adminId, notes: notes || null }, { transaction: t });
    } else {
      await assignment.update({ studentId, tutorId, assignedBy: adminId, notes: notes || null }, { transaction: t });
    }

    // Emails
    const mailToStudent = assignmentStudentEmail({ purchase, tutor });
    await sendVerifyEmail(student.email, mailToStudent.subject, mailToStudent.html);

    const mailToTutor = assignmentTutorEmail({ purchase, student });
    await sendVerifyEmail(tutor.email, mailToTutor.subject, mailToTutor.html);

    return assignment;
  });
}

async function listAssignments(filters = {}) {
  const where = {};
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.tutorId) where.tutorId = filters.tutorId;
  if (filters.purchaseId) where.purchaseId = filters.purchaseId;

  return Assignment.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { association: 'student', attributes: ['id', 'email', 'role'] },
      { association: 'tutor', attributes: ['id', 'email', 'role'] },
      { association: 'purchase' }
    ]
  });
}

module.exports = { createOrReplaceAssignment, listAssignments };
