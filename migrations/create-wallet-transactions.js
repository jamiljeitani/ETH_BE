'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wallet_transactions', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      tutorId: { type: Sequelize.UUID, allowNull: false },
      method: { type: Sequelize.ENUM('omt','whish','suyool','wu','wired_transfer'), allowNull: false },
      amount: { type: Sequelize.DECIMAL(12,2), allowNull: false },
      currency: { type: Sequelize.STRING, allowNull: false, defaultValue: 'USD' },
      status: { type: Sequelize.ENUM('pending','paid','cancelled'), allowNull: false, defaultValue: 'pending' },
      note: { type: Sequelize.TEXT, allowNull: true },
      requestedBy: { type: Sequelize.UUID, allowNull: false },
      processedBy: { type: Sequelize.UUID, allowNull: true },
      processedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('wallet_transactions', ['tutorId']);
    await queryInterface.addIndex('wallet_transactions', ['status']);
    await queryInterface.addIndex('wallet_transactions', ['method']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('wallet_transactions');
    try { await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_wallet_transactions_method";'); } catch {}
    try { await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_wallet_transactions_status";'); } catch {}
  }
};
