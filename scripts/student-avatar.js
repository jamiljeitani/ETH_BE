'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Backfill any nulls with a harmless placeholder so NOT NULL succeeds
        await queryInterface.sequelize.query(`
      UPDATE student_profiles
      SET "profilePictureUrl" = '/images/avatar-placeholder.png'
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
