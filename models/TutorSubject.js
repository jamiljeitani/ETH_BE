// models/TutorSubject.js
module.exports = (sequelize, DataTypes) => {
  const TutorSubject = sequelize.define('TutorSubject', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tutorProfileId: { type: DataTypes.UUID, allowNull: false },
    subjectId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'tutor_subjects',
    indexes: [{ unique: true, fields: ['tutorProfileId', 'subjectId'] }]
  });

  return TutorSubject;
};
