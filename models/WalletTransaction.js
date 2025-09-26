// models/WalletTransaction.js
module.exports = (sequelize, DataTypes) => {
  const WalletTransaction = sequelize.define('WalletTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tutorId: { type: DataTypes.UUID, allowNull: false },
    method: {
      type: DataTypes.ENUM('omt', 'whish', 'suyool', 'wu', 'wired_transfer'),
      allowNull: false
    },
    amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    status: { type: DataTypes.ENUM('pending','paid','cancelled'), allowNull: false, defaultValue: 'pending' },
    note: { type: DataTypes.TEXT, allowNull: true },
    requestedBy: { type: DataTypes.UUID, allowNull: false }, // tutor userId
    processedBy: { type: DataTypes.UUID, allowNull: true }, // admin userId
    processedAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'wallet_transactions',
    indexes: [{ fields: ['tutorId'] }, { fields: ['method'] }, { fields: ['status'] }]
  });
  return WalletTransaction;
};
