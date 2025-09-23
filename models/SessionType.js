// models/SessionType.js
module.exports = (sequelize, DataTypes) => {
  const SessionType = sequelize.define('SessionType', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    hourlyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    sessionHours: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'session_types',
    indexes: [{ fields: ['name'], unique: true }]
  });
  return SessionType;
};
