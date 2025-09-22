'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Backfill with empty strings instead of placeholders
        await queryInterface.sequelize.query(`
            UPDATE tutor_profiles
            SET "profilePictureUrl" = ''
            WHERE "profilePictureUrl" IS NULL
        `);
        await queryInterface.sequelize.query(`
            UPDATE tutor_profiles
            SET "idDocumentUrl" = ''
            WHERE "idDocumentUrl" IS NULL
        `);

        await queryInterface.changeColumn('tutor_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: false,
        });
        await queryInterface.changeColumn('tutor_profiles', 'idDocumentUrl', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('tutor_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.changeColumn('tutor_profiles', 'idDocumentUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    }
};
