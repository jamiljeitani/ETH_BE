// models/TutorRank.js
module.exports = (sequelize, DataTypes) => {
  const TutorRank = sequelize.define('TutorRank', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
  }, {
    tableName: 'tutor_ranks',
    indexes: [{ fields: ['name'], unique: true }]
  });
  return TutorRank;
};
