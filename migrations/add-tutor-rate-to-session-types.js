// migrations/add-tutor-rate-to-session-types.js
const sequelize = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Add tutor_rate column to session_types table
  await queryInterface.addColumn('session_types', 'tutor_rate', {
    type: 'DECIMAL(10,2)',
    allowNull: true,
    comment: 'Override rate for tutors when assigned to this session type. Must be less than hourly_rate to ensure platform profit.'
  });
  
  // Add index for performance (optional)
  await queryInterface.addIndex('session_types', ['tutor_rate']);
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  // Remove index
  await queryInterface.removeIndex('session_types', ['tutor_rate']);
  
  // Remove column
  await queryInterface.removeColumn('session_types', 'tutor_rate');
}

module.exports = { up, down };
