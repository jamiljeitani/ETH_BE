// config/mailer.js
const nodemailer = require('nodemailer');
const cfg = require('./env');

let transporter;
function getTransport() {
  if (transporter) return transporter;

  if (cfg.mail.host && cfg.mail.user && cfg.mail.pass) {
    const secure = cfg.mail.port === 465 || cfg.mail.host === 'smtp.gmail.com';
    transporter = nodemailer.createTransport({
      host: cfg.mail.host,
      port: cfg.mail.port,
      secure,
      auth: { user: cfg.mail.user, pass: cfg.mail.pass }
    });
  } else {
    transporter = {
      async sendMail(opts) {
        console.log('[DEV EMAIL] To:', opts.to);
        console.log('[DEV EMAIL] Subject:', opts.subject);
        console.log('[DEV EMAIL] HTML:', opts.html);
        return { messageId: 'dev-fallback' };
      }
    };
  }
  return transporter;
}

module.exports = { getTransport };
