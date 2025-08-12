// models/StudentSubject.js
module.exports = (sequelize, DataTypes) => {
  const StudentSubject = sequelize.define('StudentSubject', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentProfileId: { type: DataTypes.UUID, allowNull: false },
    subjectId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'student_subjects',
    indexes: [{ unique: true, fields: ['studentProfileId', 'subjectId'] }]
  });

  return StudentSubject;
};
