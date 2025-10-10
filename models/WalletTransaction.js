// models/WalletTransaction.js
module.exports = (sequelize, DataTypes) => {
  const WalletTransaction = sequelize.define('WalletTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false }, // Changed from tutorId to user_id to support both students and tutors
    amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    type: {
      type: DataTypes.ENUM(
        'session_payment',
        'withdrawal', 
        'cancellation_refund',
        'cancellation_penalty',
        'admin_adjustment',
        'withdrawal_cancellation'
      ),
      allowNull: false
    },
    reference_id: { type: DataTypes.UUID, allowNull: true }, // session_id or withdrawal_id
    description: { type: DataTypes.TEXT, allowNull: true },
    balance_after: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    
    // Legacy fields for withdrawal requests (keep for backward compatibility)
    tutorId: { type: DataTypes.UUID, allowNull: true }, // Keep for existing withdrawal system
    method: {
      type: DataTypes.ENUM('omt', 'whish', 'suyool', 'wu', 'wired_transfer'),
      allowNull: true
    },
    currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'USD' },
    status: { type: DataTypes.ENUM('pending','paid','cancelled'), allowNull: true, defaultValue: 'pending' },
    note: { type: DataTypes.TEXT, allowNull: true },
    requestedBy: { type: DataTypes.UUID, allowNull: true }, // tutor userId
    processedBy: { type: DataTypes.UUID, allowNull: true }, // admin userId
    processedAt: { type: DataTypes.DATE, allowNull: true },
    phoneNumber: { type: DataTypes.STRING, allowNull: true },
    iban: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'wallet_transactions',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
      { fields: ['reference_id'] },
      { fields: ['tutorId'] }, // Keep for backward compatibility
      { fields: ['method'] },
      { fields: ['status'] }
    ]
  });
  return WalletTransaction;
};
