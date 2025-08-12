// services/email.service.js
const { getTransport } = require('../config/mailer');
const cfg = require('../config/env');

async function safeSend(to, subject, html) {
  try {
    const tx = getTransport();
    return await tx.sendMail({ to, from: cfg.mail.from, subject, html });
  } catch (err) {
    console.warn('[MAIL WARNING]', err && err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV EMAIL FALLBACK] To:', to);
      console.log('[DEV EMAIL FALLBACK] Subject:', subject);
      console.log('[DEV EMAIL FALLBACK] HTML:', html);
      return { messageId: 'dev-fallback' };
    }
    throw err;
  }
}

async function sendVerifyEmail(to, subject, html) {
  return safeSend(to, subject, html);
}
async function sendResetEmail(to, subject, html) {
  return safeSend(to, subject, html);
}

module.exports = { sendVerifyEmail, sendResetEmail };
