// config/env.js
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  frontendURL: process.env.FRONTEND_URL || 'http://localhost:5173',

  db: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.REFRESH_SECRET,
    refreshExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d'
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'no-reply@localhost'
  },

  stripe: {
    secret: process.env.STRIPE_SECRET || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // The frontend pages you’ll build for success/cancel:
    successUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/pay/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: (process.env.FRONTEND_URL || 'http://localhost:5173') + '/pay/cancel'
  },

  timezone: process.env.TIMEZONE || 'Asia/Beirut'
};

module.exports = config;
