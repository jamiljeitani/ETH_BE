// models/StudentLanguage.js
module.exports = (sequelize, DataTypes) => {
  const StudentLanguage = sequelize.define('StudentLanguage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentProfileId: { type: DataTypes.UUID, allowNull: false },
    languageId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'student_languages',
    indexes: [{ unique: true, fields: ['studentProfileId', 'languageId'] }]
  });

  return StudentLanguage;
};
