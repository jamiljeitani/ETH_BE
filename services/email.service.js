// services/email.service.js
const { getTransport } = require('../config/mailer');
const cfg = require('../config/env');

async function safeSend(to, subject, html, options = {}) {
  try {
    const tx = getTransport();
    const authenticatedFrom = cfg.mail.user;

    const mailOptions = {
      to,
      from: `Elite Tutors Hub <${authenticatedFrom}>`,  // ✅ Fixed here
      subject,
      html,
      ...options,
      sender: authenticatedFrom,
      envelope: {
        from: authenticatedFrom,
        to: Array.isArray(to) ? to : [to]
      }
    };

    if (cfg.smtp.noReplyEmail && !mailOptions.replyTo) {
      mailOptions.replyTo = cfg.smtp.noReplyEmail;
    }

    const result = await tx.sendMail(mailOptions);

    console.log('📧 Email sent successfully:', {
      to: mailOptions.to,
      from: mailOptions.from,
      subject: mailOptions.subject,
      messageId: result.messageId
    });

    return result;
  } catch (err) {
    console.warn('[MAIL WARNING]', err?.message);
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
