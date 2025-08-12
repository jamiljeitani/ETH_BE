// models/StudentBacType.js
module.exports = (sequelize, DataTypes) => {
  const StudentBacType = sequelize.define('StudentBacType', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentProfileId: { type: DataTypes.UUID, allowNull: false },
    bacTypeId: { type: DataTypes.UUID, allowNull: false }
  }, {
    tableName: 'student_bac_types',
    indexes: [{ unique: true, fields: ['studentProfileId', 'bacTypeId'] }]
  });

  return StudentBacType;
};
