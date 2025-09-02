// services/tutor.service.js
const {
  sequelize, User, TutorProfile, TutorRank, Language, Subject, BacType
} = require('../models');

const includeTree = [
  { model: TutorRank, as: 'rank' },
  { model: Language, as: 'languages', through: { attributes: [] } },
  { model: Subject,  as: 'subjects',  through: { attributes: [] } },
  { model: BacType,  as: 'bacTypes',  through: { attributes: [] } }
];

async function getMe(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: TutorProfile, as: 'tutorProfile', include: includeTree }]
  });
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return user.tutorProfile || null;
}

async function upsertMe(userId, payload) {
  const {
    fullName, phone, dob, address, educationLevel, availabilityHoursPerWeek,
    tutoringType, payoutMethod, rankId, idDocumentUrl, profilePictureUrl,
    preferredGradesText, languageIds, subjectIds, bacTypeIds
  } = payload;

  // Validate rank
  const rank = await TutorRank.findByPk(rankId);
  if (!rank) { const e = new Error('Invalid rankId'); e.status = 400; throw e; }

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

    // Validate and set m2m
    const langs = await Language.findAll({ where: { id: languageIds }, transaction: t });
    if (langs.length !== languageIds.length) { const e = new Error('Invalid languageIds'); e.status = 400; throw e; }
    await profile.setLanguages(langs, { transaction: t });

    const subs = await Subject.findAll({ where: { id: subjectIds }, transaction: t });
    if (subs.length !== subjectIds.length) { const e = new Error('Invalid subjectIds'); e.status = 400; throw e; }
    await profile.setSubjects(subs, { transaction: t });

    const bacs = await BacType.findAll({ where: { id: bacTypeIds }, transaction: t });
    if (bacs.length !== bacTypeIds.length) { const e = new Error('Invalid bacTypeIds'); e.status = 400; throw e; }
    await profile.setBacTypes(bacs, { transaction: t });

    return TutorProfile.findByPk(profile.id, { include: includeTree, transaction: t });
  });
}

async function updateAvatar(userId, avatarUrl) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  // Update or create tutor profile with avatar URL
  const [profile] = await TutorProfile.findOrCreate({
    where: { userId },
    defaults: { userId, profilePictureUrl: avatarUrl }
  });

  if (profile.profilePictureUrl !== avatarUrl) {
    await profile.update({ profilePictureUrl: avatarUrl });
  }

  // Also update the user's main profile picture URL for navbar display
  await user.update({ profilePictureUrl: avatarUrl });

  return getMe(userId);
}

async function updateIdDocument(userId, documentUrl) {
  const user = await User.findByPk(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }

  // Update or create tutor profile with ID document URL
  const [profile] = await TutorProfile.findOrCreate({
    where: { userId },
    defaults: { userId, idDocumentUrl: documentUrl }
  });

  if (profile.idDocumentUrl !== documentUrl) {
    await profile.update({ idDocumentUrl: documentUrl });
  }

  return getMe(userId);
}

module.exports = { getMe, upsertMe, updateAvatar, updateIdDocument };
