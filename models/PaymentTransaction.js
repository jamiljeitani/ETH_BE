// models/PaymentTransaction.js
module.exports = (sequelize, DataTypes) => {
  const PaymentTransaction = sequelize.define('PaymentTransaction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    purchaseId: { type: DataTypes.UUID, allowNull: false },

    method: {
      // + stripe
      type: DataTypes.ENUM('visa', 'mastercard', 'omt', 'whish', 'suyool', 'wu', 'stripe'),
      allowNull: false
    },

    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },

    status: {
      type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'manual_review'),
      allowNull: false,
      defaultValue: 'pending'
    },

    reference: { type: DataTypes.STRING, allowNull: true },
    receiptUrl: { type: DataTypes.STRING, allowNull: true },

    // Stripe-specific
    stripeSessionId: { type: DataTypes.STRING, allowNull: true },
    stripePaymentIntentId: { type: DataTypes.STRING, allowNull: true },

    processedAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'payment_transactions',
    indexes: [
      { fields: ['purchaseId'] },
      { fields: ['method'] },
      { fields: ['status'] },
      { fields: ['stripeSessionId'] }
    ]
  });

  return PaymentTransaction;
};
