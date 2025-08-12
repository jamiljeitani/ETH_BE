// models/TutorBacType.js
module.exports = (sequelize, DataTypes) => {
  const TutorBacType = sequelize.define('TutorBacType', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tutorProfileId: { type: DataTypes.UUID, allowNull: false },
    bacTypeId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'tutor_bac_types',
    indexes: [{ unique: true, fields: ['tutorProfileId', 'bacTypeId'] }]
  });

  return TutorBacType;
};
