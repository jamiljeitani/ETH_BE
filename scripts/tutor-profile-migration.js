// migrations/XXXXXX-make-tutorprofile-rank-nullable.js
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('tutor_profiles', 'rank_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'ranks', key: 'id' },
        });

        // Optional: also make these nullable if desired
        await queryInterface.changeColumn('tutor_profiles', 'id_document_url', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        await queryInterface.changeColumn('tutor_profiles', 'profile_picture_url', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn('tutor_profiles', 'rank_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ranks', key: 'id' },
        });

        await queryInterface.changeColumn('tutor_profiles', 'id_document_url', {
            type: Sequelize.STRING,
            allowNull: false,
        });

        await queryInterface.changeColumn('tutor_profiles', 'profile_picture_url', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    }
};
