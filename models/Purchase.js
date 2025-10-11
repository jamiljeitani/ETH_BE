// models/Purchase.js
module.exports = (sequelize, DataTypes) => {
  const Purchase = sequelize.define('Purchase', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    studentId: { type: DataTypes.UUID, allowNull: false }, // -> users.id
    bundleId: { type: DataTypes.UUID, allowNull: true },   // -> bundles.id
    sessionTypeId: { type: DataTypes.UUID, allowNull: true }, // -> session_types.id

    sessionsPurchased: { type: DataTypes.INTEGER, allowNull: false },
      sessionsConsumed: {
          type: DataTypes.DECIMAL(12, 4), // or DOUBLE
          allowNull: false,
          defaultValue: 0
      },

    startDate: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'pending_review', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },

    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    feedbackEmailsSent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    assignedTutorId: { type: DataTypes.UUID, allowNull: true } // -> users.id
  }, {
    tableName: 'purchases',
    indexes: [
      { fields: ['feedbackEmailsSent'] },
      { fields: ['studentId'] },
      { fields: ['bundleId'] },
      { fields: ['sessionTypeId'] },
      { fields: ['assignedTutorId'] }
    ]
  });

  return Purchase;
};
