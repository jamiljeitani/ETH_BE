// migrations/XXXXXX-make-tutorprofile-rank-nullable.js
'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Make "rankId" nullable and keep FK to tutor_ranks(id)
        await queryInterface.changeColumn('tutor_profiles', 'rankId', {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'tutor_ranks', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        // Make "idDocumentUrl" nullable
        await queryInterface.changeColumn('tutor_profiles', 'idDocumentUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // Make "profilePictureUrl" nullable
        await queryInterface.changeColumn('tutor_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface, Sequelize) {
        // Guard: if any rows have NULL "rankId", refuse to set NOT NULL
        const [res] = await queryInterface.sequelize.query(
            'SELECT COUNT(*)::int AS cnt FROM "tutor_profiles" WHERE "rankId" IS NULL;'
        );
        if (res[0].cnt > 0) {
            throw new Error(
                `Cannot revert "rankId" to NOT NULL: ${res[0].cnt} row(s) have NULL rankId. ` +
                `Backfill them before running down migration.`
            );
        }

        // Revert "rankId" to NOT NULL and keep FK settings
        await queryInterface.changeColumn('tutor_profiles', 'rankId', {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'tutor_ranks', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL', // keep the same FK behavior as in the DDL
        });

        // Revert "idDocumentUrl" to NOT NULL
        await queryInterface.changeColumn('tutor_profiles', 'idDocumentUrl', {
            type: Sequelize.STRING,
            allowNull: false,
        });

        // Revert "profilePictureUrl" to NOT NULL
        await queryInterface.changeColumn('tutor_profiles', 'profilePictureUrl', {
            type: Sequelize.STRING,
            allowNull: false,
        });
    },
};
