// models/Timesheet.js
module.exports = (sequelize, DataTypes) => {
  const Timesheet = sequelize.define('Timesheet', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

    tutorId: { type: DataTypes.UUID, allowNull: false },
    sessionId: { type: DataTypes.UUID, allowNull: false, unique: true },

    minutes: { type: DataTypes.INTEGER, allowNull: false },
    rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },   // per-hour rate used
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // minutes/60 * rate
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },

    status: { type: DataTypes.ENUM('pending', 'approved', 'paid'), allowNull: false, defaultValue: 'pending' }
  }, {
    tableName: 'timesheets',
    indexes: [{ fields: ['tutorId'] }, { fields: ['status'] }]
  });

  return Timesheet;
};
