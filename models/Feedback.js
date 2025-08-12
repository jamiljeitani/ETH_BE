// models/Feedback.js
module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define('Feedback', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    sessionId: { type: DataTypes.UUID, allowNull: false },
    byUserId: { type: DataTypes.UUID, allowNull: false },
    byRole: { type: DataTypes.ENUM('student', 'tutor'), allowNull: false },

    metrics: { type: DataTypes.JSONB, allowNull: true }, // e.g., { clarity: 5, punctuality: 4 }
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'feedback',
    indexes: [{ fields: ['sessionId', 'byUserId'], unique: true }]
  });

  return Feedback;
};
