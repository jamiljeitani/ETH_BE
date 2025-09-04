// migrations/20250904-add-wire-and-contact-fields-to-payment-tx.js
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // add 'wire' to the existing ENUM
        await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_payment_transactions_method" ADD VALUE IF NOT EXISTS 'wire';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

        // add columns
        await queryInterface.addColumn('payment_transactions', 'payerPhone', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('payment_transactions', 'iban', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        // Note: Postgres ENUM rollback is non-trivial; keep it simple:
        await queryInterface.removeColumn('payment_transactions', 'payerPhone');
        await queryInterface.removeColumn('payment_transactions', 'iban');
        // ENUM value 'wire' will remain (safe no-op in dev/test).
    }
};
