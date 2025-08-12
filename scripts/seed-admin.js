// scripts/seed-admin.js
require('dotenv').config();
const { sequelize, User } = require('../models');
const { hashPassword } = require('../utils/crypto');
const { ROLES, USER_STATUS } = require('../utils/constants');

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const plainPass = process.env.ADMIN_PASSWORD;

  try {
    await sequelize.authenticate();
    // keep during dev to ensure tables exist
    await sequelize.sync({ alter: true });

    let user = await User.findOne({ where: { email } });
    const passwordHash = await hashPassword(plainPass);

    if (!user) {
      user = await User.create({
        email,
        passwordHash,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      });
      console.log('[ADMIN SEEDED] created:', user.email);
    } else {
      await user.update({
        passwordHash,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date()
      });
      console.log('[ADMIN SEEDED] updated existing user to admin:', user.email);
    }

    console.log('Login with:');
    console.log('  email   :', email);
    console.log('  password:', plainPass);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
