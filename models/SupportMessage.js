// models/SupportMessage.js
module.exports = (sequelize, DataTypes) => {
  const SupportMessage = sequelize.define(
    'SupportMessage',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      role: { type: DataTypes.ENUM('student', 'tutor', 'admin'), allowNull: false },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.ENUM('open', 'closed'), allowNull: false, defaultValue: 'open' },
      reply: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'support_messages',
      underscored: true,
    }
  );
  return SupportMessage;
};
