// models/SessionType.js
module.exports = (sequelize, DataTypes) => {
  const SessionType = sequelize.define('SessionType', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    hourlyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    tutorRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    sessionHours: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'session_types',
    indexes: [{ fields: ['name'], unique: true }],
    validate: {
      tutorRateLessThanHourlyRate() {
        if (this.tutorRate !== null && this.tutorRate !== undefined && 
            this.hourlyRate !== null && this.hourlyRate !== undefined) {
          if (Number(this.tutorRate) >= Number(this.hourlyRate)) {
            throw new Error('Tutor rate must be less than hourly rate to ensure platform profit');
          }
        }
      }
    }
  });
  return SessionType;
};
