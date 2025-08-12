// models/Session.js
module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    purchaseId: { type: DataTypes.UUID, allowNull: false },  // -> purchases.id
    calendarEventId: { type: DataTypes.UUID, allowNull: true }, // -> calendar_events.id
    studentId: { type: DataTypes.UUID, allowNull: false },   // -> users.id
    tutorId: { type: DataTypes.UUID, allowNull: false },     // -> users.id
    subjectId: { type: DataTypes.UUID, allowNull: true },    // -> subjects.id

    deliveryMode: { type: DataTypes.ENUM('online', 'in-person'), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },

    status: { type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'), allowNull: false, defaultValue: 'in_progress' },

    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    endedAt: { type: DataTypes.DATE, allowNull: true },

    totalMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },  // computed at end
    overageMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } // minutes beyond remaining balance
  }, {
    tableName: 'sessions',
    indexes: [{ fields: ['purchaseId'] }, { fields: ['tutorId'] }, { fields: ['studentId'] }, { fields: ['status'] }]
  });

  return Session;
};
