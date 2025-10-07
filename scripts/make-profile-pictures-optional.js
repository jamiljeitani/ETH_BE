// scripts/make-profile-pictures-optional.js
'use strict';

const sequelize = require('../config/database');

async function makeProfilePicturesOptional() {
  try {
    console.log('Starting migration: Making profile pictures optional...');
    
    // Make profilePictureUrl optional in student_profiles table
    await sequelize.query(`
      ALTER TABLE student_profiles 
      ALTER COLUMN "profilePictureUrl" DROP NOT NULL;
    `);
    console.log('✅ Updated student_profiles.profilePictureUrl to allow NULL');
    
    // Make profilePictureUrl optional in tutor_profiles table
    await sequelize.query(`
      ALTER TABLE tutor_profiles 
      ALTER COLUMN "profilePictureUrl" DROP NOT NULL;
    `);
    console.log('✅ Updated tutor_profiles.profilePictureUrl to allow NULL');
    
    console.log('🎉 Migration completed successfully! Profile pictures are now optional.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
makeProfilePicturesOptional()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
