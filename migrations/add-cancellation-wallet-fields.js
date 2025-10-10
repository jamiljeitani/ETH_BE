'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add wallet_balance to users table
    await queryInterface.addColumn('users', 'wallet_balance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    });

    // Add index for wallet_balance
    await queryInterface.addIndex('users', ['wallet_balance']);

    // Add cancellation tracking fields to calendar_events
    await queryInterface.addColumn('calendar_events', 'cancelledBy', {
      type: Sequelize.UUID,
      allowNull: true
    });

    await queryInterface.addColumn('calendar_events', 'cancelledAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add new fields to wallet_transactions table
    await queryInterface.addColumn('wallet_transactions', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true // Allow null for backward compatibility
    });

    await queryInterface.addColumn('wallet_transactions', 'type', {
      type: Sequelize.ENUM(
        'session_payment',
        'withdrawal', 
        'cancellation_refund',
        'cancellation_penalty',
        'admin_adjustment',
        'withdrawal_cancellation'
      ),
      allowNull: true // Allow null for backward compatibility
    });

    await queryInterface.addColumn('wallet_transactions', 'reference_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    await queryInterface.addColumn('wallet_transactions', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('wallet_transactions', 'balance_after', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    // Add indexes for new wallet_transactions fields
    await queryInterface.addIndex('wallet_transactions', ['user_id']);
    await queryInterface.addIndex('wallet_transactions', ['type']);
    await queryInterface.addIndex('wallet_transactions', ['reference_id']);

    // Update existing withdrawal records to have the new fields
    await queryInterface.sequelize.query(`
      UPDATE wallet_transactions 
      SET 
        user_id = tutorId,
        type = 'withdrawal',
        balance_after = amount
      WHERE tutorId IS NOT NULL AND user_id IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('users', ['wallet_balance']);
    await queryInterface.removeIndex('wallet_transactions', ['user_id']);
    await queryInterface.removeIndex('wallet_transactions', ['type']);
    await queryInterface.removeIndex('wallet_transactions', ['reference_id']);

    // Remove columns
    await queryInterface.removeColumn('users', 'wallet_balance');
    await queryInterface.removeColumn('calendar_events', 'cancelledBy');
    await queryInterface.removeColumn('calendar_events', 'cancelledAt');
    await queryInterface.removeColumn('wallet_transactions', 'user_id');
    await queryInterface.removeColumn('wallet_transactions', 'type');
    await queryInterface.removeColumn('wallet_transactions', 'reference_id');
    await queryInterface.removeColumn('wallet_transactions', 'description');
    await queryInterface.removeColumn('wallet_transactions', 'balance_after');
  }
};
