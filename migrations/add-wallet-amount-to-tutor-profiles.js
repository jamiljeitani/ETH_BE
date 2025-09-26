'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tutor_profiles', 'walletAmount', {
      type: Sequelize.DECIMAL(12,2),
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tutor_profiles', 'walletAmount');
  }
};
