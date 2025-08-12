// models/EmailVerification.js
module.exports = (sequelize, DataTypes) => {
  const EmailVerification = sequelize.define('EmailVerification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'email_verifications',
    indexes: [{ fields: ['token'], unique: true }, { fields: ['userId'] }]
  });

  return EmailVerification;
};
