// models/Consumption.js
module.exports = (sequelize, DataTypes) => {
  const Consumption = sequelize.define('Consumption', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    purchaseId: { type: DataTypes.UUID, allowNull: false },
    sessionId: { type: DataTypes.UUID, allowNull: false },

    minutes: { type: DataTypes.INTEGER, allowNull: false }, // deducted minutes
    balanceBeforeMinutes: { type: DataTypes.INTEGER, allowNull: false },
    balanceAfterMinutes: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'consumptions',
    indexes: [{ fields: ['purchaseId'] }, { fields: ['sessionId'], unique: true }]
  });

  return Consumption;
};
