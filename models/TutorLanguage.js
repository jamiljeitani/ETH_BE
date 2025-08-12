// models/TutorLanguage.js
module.exports = (sequelize, DataTypes) => {
  const TutorLanguage = sequelize.define('TutorLanguage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tutorProfileId: { type: DataTypes.UUID, allowNull: false },
    languageId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'tutor_languages',
    indexes: [{ unique: true, fields: ['tutorProfileId', 'languageId'] }]
  });

  return TutorLanguage;
};
