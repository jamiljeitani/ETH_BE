// models/TutorChangeRequest.js
module.exports = (sequelize, DataTypes) => {
  const TutorChangeRequest = sequelize.define('TutorChangeRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    studentId:  { type: DataTypes.UUID, allowNull: false }, // -> users.id
    purchaseId: { type: DataTypes.UUID, allowNull: false }, // -> purchases.id
    currentTutorId: { type: DataTypes.UUID, allowNull: true }, // -> users.id

    reason: { type: DataTypes.TEXT, allowNull: true },

    status: { // pending → approved|rejected
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    approvalNote: { type: DataTypes.TEXT, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    handledBy: { type: DataTypes.UUID, allowNull: true }, // admin id
    handledAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'tutor_change_requests',
    indexes: [
      { fields: ['studentId'] }, 
      { fields: ['purchaseId'] }, 
      { fields: ['status'] },
      { fields: ['currentTutorId'] }
    ]
  });

  return TutorChangeRequest;
};
