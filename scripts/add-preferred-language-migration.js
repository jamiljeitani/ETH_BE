// scripts/add-preferred-language-migration.js
require('dotenv').config();
const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Add preferredLanguage column to users table
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "preferredLanguage" VARCHAR(10) DEFAULT 'en';
    `);

    console.log('Successfully added preferredLanguage column to users table');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
