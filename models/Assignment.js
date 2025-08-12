// models/Assignment.js
module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define('Assignment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    studentId: { type: DataTypes.UUID, allowNull: false }, // -> users.id (role: student)
    tutorId:   { type: DataTypes.UUID, allowNull: false }, // -> users.id (role: tutor)
    purchaseId:{ type: DataTypes.UUID, allowNull: false }, // -> purchases.id

    assignedBy:{ type: DataTypes.UUID, allowNull: false }, // admin user id
    assignedAt:{ type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },

    notes: { type: DataTypes.STRING, allowNull: true }
  }, {
    tableName: 'assignments',
    indexes: [
      { fields: ['studentId'] },
      { fields: ['tutorId'] },
      { fields: ['purchaseId'], unique: true } // one assignment per purchase
    ]
  });

  return Assignment;
};
