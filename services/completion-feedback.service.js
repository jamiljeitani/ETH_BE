// services/completion-feedback.service.js (PATCHED)
const { sequelize, Purchase, User, Session } = require('../models');
const cfg = require('../config/env');
const { sendGenericEmail } = require('./email.service');

function emailHtml({ heading, session, link }) {
  const started = session?.startedAt ? new Date(session.startedAt).toLocaleString() : '—';
  const ended   = session?.endedAt   ? new Date(session.endedAt).toLocaleString() : '—';
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">
      <h2>${heading}</h2>
      <p>We’d love your feedback on the last session.</p>
      <ul>
        <li><strong>Session ID:</strong> ${session?.id}</li>
        <li><strong>Started:</strong> ${started}</li>
        ${session?.endedAt ? `<li><strong>Ended:</strong> ${ended}</li>` : ''}
      </ul>
      <p><a href="${link}">Leave feedback here</a>.</p>
      <p>(You can also open the app and find the session in your history.)</p>
    </div>
  `;
}

/**
 * Send tutor+student feedback requests for a finished session.
 * Called every time a session ends (idempotency handled by mail provider/rate limits if needed).
 */
async function maybeSendCompletionFeedbackEmails({ purchaseId, sessionId }) {
  const [purchase, session] = await Promise.all([
    Purchase.findByPk(purchaseId),
    Session.findByPk(sessionId)
  ]);
  if (!purchase || !session) return { sent: false };

  const [tutor, student] = await Promise.all([
    User.findByPk(session.tutorId, { attributes: ['email'] }),
    User.findByPk(session.studentId, { attributes: ['email'] })
  ]);

  const base = (cfg.frontendURL || 'http://localhost:5173').replace(/\/$/, '');
  // Include both sessionId and purchaseId so the frontend can decorate and submit
  const studentLink = `${base}/student/feedback?sessionId=${encodeURIComponent(session.id)}&purchaseId=${encodeURIComponent(purchase.id)}`;
  const tutorLink   = `${base}/tutor/feedback?sessionId=${encodeURIComponent(session.id)}&purchaseId=${encodeURIComponent(purchase.id)}`;

  const subj = `Please share feedback for session ${session.id}`;

  await Promise.all([
    tutor?.email
      ? sendGenericEmail(tutor.email, subj, emailHtml({ heading: 'Session feedback', session, link: tutorLink }))
      : Promise.resolve(),
    student?.email
      ? sendGenericEmail(student.email, subj, emailHtml({ heading: 'Session feedback', session, link: studentLink }))
      : Promise.resolve()
  ]);

  return { sent: true };
}

module.exports = { maybeSendCompletionFeedbackEmails };
