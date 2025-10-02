'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('purchases', 'feedback_emails_sent', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addIndex('purchases', ['feedback_emails_sent']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('purchases', ['feedback_emails_sent']);
    await queryInterface.removeColumn('purchases', 'feedback_emails_sent');
  }
};
