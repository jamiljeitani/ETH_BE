// migrations/add-assigned-tutor-to-purchases.js
const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Add assignedTutorId column to purchases table
  await queryInterface.addColumn('purchases', 'assignedTutorId', {
    type: 'VARCHAR(255)',
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
  
  // Add index for assignedTutorId
  await queryInterface.addIndex('purchases', ['assignedTutorId']);
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Remove index
  await queryInterface.removeIndex('purchases', ['assignedTutorId']);
  
  // Remove column
  await queryInterface.removeColumn('purchases', 'assignedTutorId');
}

module.exports = { up, down };
