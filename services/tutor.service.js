// services/tutor.service.js
const {
  sequelize, User, TutorProfile, TutorRank, Language, Subject, BacType,
  Assignment, StudentProfile
} = require('../models');

const includeTree = [
  { model: TutorRank, as: 'rank' },
  { model: Language, as: 'languages', through: { attributes: [] } },
  { model: Subject,  as: 'subjects',  through: { attributes: [] } },
  { model: BacType,  as: 'bacTypes',  through: { attributes: [] } }
];

async function getMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  const withProfile = await User.findByPk(userId, {
    include: [{ model: TutorProfile, as: 'tutorProfile', required: true, include: includeTree }]
  });

  if (!withProfile) {
    const e = new Error('Tutor profile not found for this user');
    e.status = 404;
    throw e;
  }
  return withProfile.tutorProfile;
}

async function upsertMe(userId, payload) {
  const {
    fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
    tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl,
    preferredGradesText, languageIds = [], subjectIds = [], bacTypeIds = []
  } = payload;

  return sequelize.transaction(async (t) => {
    let profile = await TutorProfile.findOne({ where: { userId }, transaction: t });

    if (!profile) {
      profile = await TutorProfile.create({
        userId, fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
        tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl, preferredGradesText
      }, { transaction: t });
    } else {
      await profile.update({
        fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
        tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl, preferredGradesText
      }, { transaction: t });
    }

    // M2M safely handle empty arrays
    const langs = languageIds.length ? await Language.findAll({ where: { id: languageIds }, transaction: t }) : [];
    if (languageIds.length && langs.length !== languageIds.length) { const e = new Error('Invalid languageIds'); e.status = 400; throw e; }
    await profile.setLanguages(langs, { transaction: t });

    const subs = subjectIds.length ? await Subject.findAll({ where: { id: subjectIds }, transaction: t }) : [];
    if (subjectIds.length && subs.length !== subjectIds.length) { const e = new Error('Invalid subjectIds'); e.status = 400; throw e; }
    await profile.setSubjects(subs, { transaction: t });

    const bacs = bacTypeIds.length ? await BacType.findAll({ where: { id: bacTypeIds }, transaction: t }) : [];
    if (bacTypeIds.length && bacs.length !== bacTypeIds.length) { const e = new Error('Invalid bacTypeIds'); e.status = 400; throw e; }
    await profile.setBacTypes(bacs, { transaction: t });

    return TutorProfile.findByPk(profile.id, { include: includeTree, transaction: t });
  });
}

/** NEW: return unique students assigned to this tutor */
async function listAssignedStudents(tutorUserId) {
  const rows = await Assignment.findAll({
    where: { tutorId: tutorUserId },
    include: [{
      association: 'student',
      attributes: ['id', 'email'],
      include: [{ model: StudentProfile, as: 'studentProfile', attributes: ['fullName'] }]
    }],
    order: [['createdAt', 'DESC']],
  });

  const seen = new Set();
  const out = [];
  for (const a of rows) {
    const s = a.student;
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      out.push({
        id: s.id,
        email: s.email,
        fullName: s.studentProfile?.fullName || s.email,
      });
    }
  }
  return out;
}

async function updateAvatar(userId, avatarUrl) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  const [profile] = await TutorProfile.findOrCreate({
    where: { userId },
    defaults: { userId, profilePictureUrl: avatarUrl }
  });

  if (profile.profilePictureUrl !== avatarUrl) {
    await profile.update({ profilePictureUrl: avatarUrl });
  }

  await user.update({ profilePictureUrl: avatarUrl });
  return getMe(userId);
}

async function updateIdDocument(userId, documentUrl) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  const [profile] = await TutorProfile.findOrCreate({
    where: { userId },
    defaults: { userId, idDocumentUrl: documentUrl }
  });

  if (profile.idDocumentUrl !== documentUrl) {
    await profile.update({ idDocumentUrl: documentUrl });
  }
  return getMe(userId);
}

module.exports = { getMe, upsertMe, listAssignedStudents, updateAvatar, updateIdDocument };
