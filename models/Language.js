// models/Language.js
module.exports = (sequelize, DataTypes) => {
  const Language = sequelize.define('Language', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, allowNull: true, unique: true } 
  }, {
    tableName: 'languages',
    indexes: [{ fields: ['name'], unique: true }]
  });
  return Language;
};
