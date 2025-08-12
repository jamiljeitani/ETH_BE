// models/TutorChangeRequest.js
module.exports = (sequelize, DataTypes) => {
  const TutorChangeRequest = sequelize.define('TutorChangeRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    studentId:  { type: DataTypes.UUID, allowNull: false }, // -> users.id
    purchaseId: { type: DataTypes.UUID, allowNull: false }, // -> purchases.id

    reason: { type: DataTypes.TEXT, allowNull: false },

    status: { // pending → approved|rejected
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    handledBy: { type: DataTypes.UUID, allowNull: true }, // admin id
    handledAt: { type: DataTypes.DATE, allowNull: true },
    resolutionNote: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'tutor_change_requests',
    indexes: [{ fields: ['studentId'] }, { fields: ['purchaseId'] }, { fields: ['status'] }]
  });

  return TutorChangeRequest;
};
