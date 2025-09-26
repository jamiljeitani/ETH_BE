'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('wallet_transactions', 'phoneNumber', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('wallet_transactions', 'iban', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('wallet_transactions', 'phoneNumber');
    await queryInterface.removeColumn('wallet_transactions', 'iban');
  }
};
