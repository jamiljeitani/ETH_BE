// services/assignment.service.js
const {
  sequelize,
  User,
  Purchase,
  Assignment,
  StudentProfile,
  TutorProfile,
  SessionType,
  Bundle,
} = require("../models");

const { UniqueConstraintError } = require('sequelize'); // ✅ add this

const { assignmentStudentEmail, assignmentTutorEmail } =
  require("../utils/emailTemplates");
const { sendVerifyEmail } = require("./email.service");

/**
 * Create or replace an assignment for a given purchase.
 * One assignment per purchase is enforced.
 */
async function createOrReplaceAssignment(
    adminId,
    { studentId, tutorId, purchaseId, notes }
) {
  return sequelize.transaction(async (t) => {
    const purchase = await Purchase.findOne({
      where: { id: purchaseId },
      include: [{ association: 'student', required: true }],
      transaction: t,
      lock: { level: t.LOCK.UPDATE, of: Purchase },
    });

    const [student, tutor] = await Promise.all([
      User.findByPk(studentId, { transaction: t }),
      User.findByPk(tutorId, { transaction: t }),
    ]);

    if (!student || student.role !== 'student') { const e = new Error('Invalid studentId'); e.status = 400; throw e; }
    if (!tutor || tutor.role !== 'tutor') { const e = new Error('Invalid tutorId'); e.status = 400; throw e; }
    if (!purchase || purchase.studentId !== studentId) { const e = new Error('Invalid purchaseId'); e.status = 400; throw e; }
    if (!['active'].includes(purchase.status)) { const e = new Error('Purchase must be active'); e.status = 400; throw e; }

    let assignment = await Assignment.findOne({
      where: { purchaseId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const payload = {
      studentId,
      tutorId,
      purchaseId,
      assignedBy: adminId,
      notes: notes || null,
    };

    if (!assignment) {
      try {
        assignment = await Assignment.create(payload, { transaction: t });
      } catch (err) {
        if (err instanceof UniqueConstraintError) {
          assignment = await Assignment.findOne({
            where: { purchaseId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          await assignment.update(payload, { transaction: t });
        } else {
          throw err;
        }
      }
    } else {
      await assignment.update(payload, { transaction: t });
    }

    // best-effort emails
    try {
      if (sendVerifyEmail && assignmentStudentEmail && assignmentTutorEmail) {
        const mailToStudent = assignmentStudentEmail({
          purchase,
          tutor: { id: tutor.id, name: tutor.name },
        });
        await sendVerifyEmail(student.email, mailToStudent.subject, mailToStudent.html);

        const mailToTutor = assignmentTutorEmail({
          purchase,
          student: { id: student.id, name: student.name },
        });
        await sendVerifyEmail(tutor.email, mailToTutor.subject, mailToTutor.html);
      }
    } catch (err) {
      console.warn('[assignment.service] email send failed:', err?.message || err);
    }

    return assignment;
  });
}

async function updateAssignment(adminId, id, { tutorId, notes }) {
  return sequelize.transaction(async (t) => {
    const assignment = await Assignment.findByPk(id, { transaction: t });
    if (!assignment) { const e = new Error('Assignment not found'); e.status = 404; throw e; }

    const payload = {};
    if (tutorId) {
      const tutor = await User.findByPk(tutorId, { transaction: t });
      if (!tutor || tutor.role !== 'tutor') { const e = new Error('Invalid tutorId'); e.status = 400; throw e; }
      payload.tutorId = tutorId;
    }
    if (notes !== undefined) payload.notes = notes || null;
    payload.assignedBy = adminId;

    await assignment.update(payload, { transaction: t });
    return assignment;
  });
}

async function removeAssignment(id) {
  const count = await Assignment.destroy({ where: { id } });
  if (!count) { const e = new Error('Assignment not found'); e.status = 404; throw e; }
  return { deleted: true };
}

async function listAssignments(filters = {}) {
  const where = {};
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.tutorId) where.tutorId = filters.tutorId;
  if (filters.purchaseId) where.purchaseId = filters.purchaseId;

  const assignments = await Assignment.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      {
        association: 'student',
        attributes: ['id', 'email', 'role'],
        include: [{
          model: StudentProfile,
          as: 'studentProfile',
          attributes: ['fullName', 'school'],
          required: false
        }]
      },
      {
        association: 'tutor',
        attributes: ['id', 'email', 'role'],
        include: [{
          model: TutorProfile,
          as: 'tutorProfile',
          attributes: ['fullName', 'educationLevel'],
          required: false
        }]
      },
      {
        association: 'purchase',
        include: [
          { model: SessionType, as: 'sessionType', attributes: ['name', 'hourlyRate'] },
          { model: Bundle, as: 'bundle', attributes: ['name'] },
        ],
      },
    ],
  });

  return assignments.map((a) => ({
    id: a.id,
    studentId: a.studentId,
    tutorId: a.tutorId,
    purchaseId: a.purchaseId,
    createdAt: a.createdAt,
    notes: a.notes,
    student: {
      id: a.student?.id,
      email: a.student?.email,
      displayName: a.student?.studentProfile?.fullName || a.student?.email,
      school: a.student?.studentProfile?.school,
    },
    tutor: {
      id: a.tutor?.id,
      email: a.tutor?.email,
      displayName: a.tutor?.tutorProfile?.fullName || a.tutor?.email,
      education: a.tutor?.tutorProfile?.educationLevel,
    },
    purchase: {
      id: a.purchase?.id,
      hours: a.purchase?.hours,
      status: a.purchase?.status,
      displayName: a.purchase?.bundleId
        ? `${a.purchase?.bundle?.name || 'Bundle'} (${a.purchase?.sessionsPurchased})`
        : `${a.purchase?.sessionType?.name || 'Session'} (${a.purchase?.sessionsPurchased})`,
    },
  }));
}

module.exports = {
  createOrReplaceAssignment,
  updateAssignment,
  removeAssignment,
  listAssignments,
};
