'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sync wallet balances from tutor_profiles.walletAmount to users.wallet_balance
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET wallet_balance = COALESCE(tp.walletAmount, 0)
      FROM tutor_profiles tp 
      WHERE users.id = tp."userId" 
      AND users.role = 'tutor'
    `);
  },

  async down(queryInterface, Sequelize) {
    // This migration is not reversible as we can't determine which balance was original
    // If needed, you would need to restore from backup
    console.log('Warning: This migration cannot be reversed automatically');
  }
};
