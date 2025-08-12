// models/BundleItem.js
module.exports = (sequelize, DataTypes) => {
  const BundleItem = sequelize.define('BundleItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bundleId: { type: DataTypes.UUID, allowNull: false },
    sessionTypeId: { type: DataTypes.UUID, allowNull: false },
    hours: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'bundle_items',
    indexes: [{ fields: ['bundleId'] }, { fields: ['sessionTypeId'] }]
  });
  return BundleItem;
};
