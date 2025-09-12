// models/BacType.js
module.exports = (sequelize, DataTypes) => {
  const BacType = sequelize.define('BacType', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'bac_types',
    indexes: [{ fields: ['name'], unique: true }]
  });
  return BacType;
};
