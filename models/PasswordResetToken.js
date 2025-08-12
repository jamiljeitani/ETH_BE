// models/PasswordResetToken.js
module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false }
  }, {
    tableName: 'password_reset_tokens',
    indexes: [{ fields: ['token'], unique: true }, { fields: ['userId'] }]
  });

  return PasswordResetToken;
};
