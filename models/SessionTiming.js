// models/SessionTiming.js
module.exports = (sequelize, DataTypes) => {
  const SessionTiming = sequelize.define('SessionTiming', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sessionId: { type: DataTypes.UUID, allowNull: false },
    startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    endedAt: { type: DataTypes.DATE, allowNull: true }, // null while running
    minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } // computed on close
  }, {
    tableName: 'session_timings',
    indexes: [{ fields: ['sessionId'] }]
  });

  return SessionTiming;
};
