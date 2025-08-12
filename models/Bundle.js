// models/Bundle.js
module.exports = (sequelize, DataTypes) => {
  const Bundle = sequelize.define('Bundle', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'bundles',
    indexes: [{ fields: ['name'], unique: true }]
  });
  return Bundle;
};
