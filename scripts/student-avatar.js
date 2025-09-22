'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Backfill any nulls with empty string
        await queryInterface.sequelize.query(`
            UPDATE student_profiles
            SET "profilePictureUrl" = ''
            WHERE "profilePictureUrl" IS NULL
        `);

        await queryInterface.changeColumn('student_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('student_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    }
};
