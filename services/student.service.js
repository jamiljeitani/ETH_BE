// services/student.service.js
const {
  sequelize, User, StudentProfile, Grade, Language, Subject, BacType
} = require('../models');

const includeTree = [
  { model: Grade, as: 'grade' },
  { model: Language, as: 'languages', through: { attributes: [] } },
  { model: Subject,  as: 'subjects',  through: { attributes: [] } },
  { model: BacType,  as: 'bacTypes',  through: { attributes: [] } }
];

async function getMe(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: StudentProfile, as: 'studentProfile', include: includeTree }]
  });
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return user.studentProfile || null;
}

async function upsertMe(userId, payload) {
  const {
    fullName, guardianName, guardianPhone, phone, dob, address, school, gradeId,
    languageIds, subjectIds, bacTypeIds, profilePictureUrl, notes
  } = payload;

  // Validate grade
  const grade = await Grade.findByPk(gradeId);
  if (!grade) { const e = new Error('Invalid gradeId'); e.status = 400; throw e; }

  return sequelize.transaction(async (t) => {
    let profile = await StudentProfile.findOne({ where: { userId }, transaction: t });

    if (!profile) {
      profile = await StudentProfile.create({
        userId, fullName, guardianName, guardianPhone, phone, dob, address, school,
        gradeId, profilePictureUrl, notes
      }, { transaction: t });
    } else {
      await profile.update({
        fullName, guardianName, guardianPhone, phone, dob, address, school,
        gradeId, profilePictureUrl, notes
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

    return StudentProfile.findByPk(profile.id, { include: includeTree, transaction: t });
  });
}

module.exports = { getMe, upsertMe };
