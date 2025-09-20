'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Backfill with placeholders
        await queryInterface.sequelize.query(`
      UPDATE tutor_profiles
      SET "profilePictureUrl" = '/images/avatar-placeholder.png'
      WHERE "profilePictureUrl" IS NULL
    `);
        await queryInterface.sequelize.query(`
      UPDATE tutor_profiles
      SET "idDocumentUrl" = '/images/doc-placeholder.pdf'
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
