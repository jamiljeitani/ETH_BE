// services/email.service.js
const { getTransport } = require('../config/mailer');
const cfg = require('../config/env');

async function safeSend(to, subject, html, options = {}) {
  try {
    const tx = getTransport();
    const mailOptions = {
      to,
      from: cfg.mail.from,
      subject,
      html,
      ...options
    };
    // Add Reply-To if not-reply email is configured and not already set
    if (cfg.smtp.noReplyEmail && !mailOptions.replyTo) {
      mailOptions.replyTo = cfg.smtp.noReplyEmail;
    }
    return await tx.sendMail(mailOptions);
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
// Generic export for any other mail (purchase confirmations, etc.)
async function sendGenericEmail(to, subject, html) {
  return safeSend(to, subject, html);
}

module.exports = { sendVerifyEmail, sendResetEmail, sendGenericEmail };
