// migrations/update-tutor-change-requests.js
const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Add currentTutorId column to tutor_change_requests table
  await queryInterface.addColumn('tutor_change_requests', 'currentTutorId', {
    type: 'VARCHAR(255)',
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });
  
  // Add approvalNote column
  await queryInterface.addColumn('tutor_change_requests', 'approvalNote', {
    type: 'TEXT',
    allowNull: true
  });
  
  // Add rejectionReason column
  await queryInterface.addColumn('tutor_change_requests', 'rejectionReason', {
    type: 'TEXT',
    allowNull: true
  });
  
  // Make reason column nullable
  await queryInterface.changeColumn('tutor_change_requests', 'reason', {
    type: 'TEXT',
    allowNull: true
  });
  
  // Add index for currentTutorId
  await queryInterface.addIndex('tutor_change_requests', ['currentTutorId']);
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Remove index
  await queryInterface.removeIndex('tutor_change_requests', ['currentTutorId']);
  
  // Remove columns
  await queryInterface.removeColumn('tutor_change_requests', 'currentTutorId');
  await queryInterface.removeColumn('tutor_change_requests', 'approvalNote');
  await queryInterface.removeColumn('tutor_change_requests', 'rejectionReason');
  
  // Make reason column not nullable again
  await queryInterface.changeColumn('tutor_change_requests', 'reason', {
    type: 'TEXT',
    allowNull: false
  });
}

module.exports = { up, down };
