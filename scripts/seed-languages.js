// scripts/seed-languages.js
require('dotenv').config();
const { sequelize, Language } = require('../models');

const languages = [
  { name: 'English', code: 'en' },
  { name: 'French', code: 'fr' },
  { name: 'Arabic', code: 'ar' }
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Ensure tables exist
    await sequelize.sync({ alter: true });

    for (const lang of languages) {
      // First try to find by name
      let language = await Language.findOne({ where: { name: lang.name } });

      if (language) {
        // Update existing language to add code if missing
        await language.update({ code: lang.code });
        console.log(`Updated existing language: ${language.name} (${language.code})`);
      } else {
        // Try to find by code
        language = await Language.findOne({ where: { code: lang.code } });

        if (language) {
          // Update name if found by code
          await language.update({ name: lang.name });
          console.log(`Updated language name: ${language.name} (${language.code})`);
        } else {
          // Create new language
          language = await Language.create(lang);
          console.log(`Created language: ${language.name} (${language.code})`);
        }
      }
    }

    console.log('Language seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Language seeding failed:', err);
    process.exit(1);
  }
})();
