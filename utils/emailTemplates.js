// utils/emailTemplates.js
const cfg = require('../config/env');

function verifyEmailTemplate({ token }) {
  const link = `${cfg.baseUrl}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
  return {
    subject: 'Verify your email',
    html: `<p>Welcome!</p><p>Please verify your email by clicking <a href="${link}">this link</a>.</p>
           <p>If you cannot click, use this token: <code>${token}</code></p>`
  };
}

function resetPasswordTemplate({ token }) {
  const link = `${cfg.frontendURL}/reset?token=${encodeURIComponent(token)}`;
  return {
    subject: 'Reset your password',
    html: `<p>You requested a password reset.</p><p>Reset via <a href="${link}">this link</a>.</p>
           <p>Or use this token: <code>${token}</code></p>`
  };
}


function purchaseConfirmationEmail({ purchase }) {
  const kind = purchase.bundle ? `Bundle: ${purchase.bundle.name}` :
    `Custom: ${purchase.sessionType?.name} (${purchase.hoursPurchased}h)`;
  return {
    subject: 'Purchase confirmed — a tutor will be assigned shortly',
    html: `
      <p>Thank you! Your purchase is confirmed.</p>
      <ul>
        <li><strong>Type:</strong> ${kind}</li>
        <li><strong>Start date:</strong> ${new Date(purchase.startDate).toLocaleString()}</li>
        <li><strong>Hours:</strong> ${purchase.hoursPurchased}</li>
        <li><strong>Amount:</strong> ${purchase.amount} ${purchase.currency}</li>
      </ul>
      <p>A tutor will be assigned to you shortly. We will keep you posted.</p>
    `
  };
}

function pendingReviewEmail({ purchase }) {
  const kind = purchase.bundle ? `Bundle: ${purchase.bundle.name}` :
    `Custom: ${purchase.sessionType?.name} (${purchase.hoursPurchased}h)`;
  return {
    subject: 'Payment received — pending review',
    html: `
      <p>We received your payment request for review.</p>
      <ul>
        <li><strong>Type:</strong> ${kind}</li>
        <li><strong>Start date:</strong> ${new Date(purchase.startDate).toLocaleString()}</li>
        <li><strong>Amount:</strong> ${purchase.amount} ${purchase.currency}</li>
      </ul>
      <p>We’ll notify you once it’s approved.</p>
    `
  };
}

function assignmentStudentEmail({ purchase, tutor }) {
  return {
    subject: 'Tutor assigned to your purchase',
    html: `
      <p>Great news! A tutor has been assigned to your subscription.</p>
      <ul>
        <li><strong>Tutor:</strong> ${tutor.email}</li>
        <li><strong>Start date:</strong> ${new Date(purchase.startDate).toLocaleString()}</li>
        <li><strong>Hours:</strong> ${purchase.hoursPurchased}</li>
      </ul>
      <p>You can coordinate sessions from your schedule page.</p>
    `
  };
}

function assignmentTutorEmail({ purchase, student }) {
  return {
    subject: 'You have been assigned a new student',
    html: `
      <p>You have a new assignment.</p>
      <ul>
        <li><strong>Student:</strong> ${student.email}</li>
        <li><strong>Start date:</strong> ${new Date(purchase.startDate).toLocaleString()}</li>
        <li><strong>Hours:</strong> ${purchase.hoursPurchased}</li>
      </ul>
      <p>Please propose initial session times in the calendar.</p>
    `
  };
}

function changeRequestReceivedEmail({ purchase, reason }) {
  return {
    subject: 'We received your tutor change request',
    html: `
      <p>Your request to change tutor was received.</p>
      <ul>
        <li><strong>Purchase ID:</strong> ${purchase.id}</li>
        <li><strong>Reason:</strong> ${reason}</li>
      </ul>
      <p>We will review and get back to you shortly.</p>
    `
  };
}

function changeRequestDecisionEmail({ purchase, decision, resolutionNote }) {
  const friendly = decision === 'approved' ? 'approved' : 'rejected';
  return {
    subject: `Tutor change request ${friendly}`,
    html: `
      <p>Your request to change tutor was <strong>${friendly}</strong>.</p>
      <ul>
        <li><strong>Purchase ID:</strong> ${purchase.id}</li>
      </ul>
      ${resolutionNote ? `<p><strong>Note:</strong> ${resolutionNote}</p>` : ''}
      <p>${decision === 'approved'
        ? 'We will proceed to assign a new tutor shortly.'
        : 'If you have additional context, feel free to reply.'}
      </p>
    `
  };
}

function fmtDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

function calendarProposedEmail({ recipientRole, event, otherEmail }) {
  const who = recipientRole === 'student' ? 'Student' : 'Tutor';
  return {
    subject: `New ${event.type} proposed`,
    html: `
      <p>A new ${event.type} was proposed.</p>
      <ul>
        <li><strong>With:</strong> ${otherEmail}</li>
        <li><strong>Start:</strong> ${fmtDate(event.startAt)}</li>
        <li><strong>End:</strong> ${fmtDate(event.endAt)}</li>
        ${event.title ? `<li><strong>Title:</strong> ${event.title}</li>` : ''}
        ${event.locationType ? `<li><strong>Location:</strong> ${event.locationType} — ${event.locationDetails || ''}</li>` : ''}
      </ul>
      <p>Please review and accept/reject in your dashboard.</p>
    `
  };
}

function calendarStatusEmail({ event, status, reason, note }) {
  const extra = reason || note ? `<p><strong>Note:</strong> ${reason || note}</p>` : '';
  return {
    subject: `Event ${status}`,
    html: `
      <p>Your ${event.type} was <strong>${status}</strong>.</p>
      <ul>
        <li><strong>Start:</strong> ${fmtDate(event.startAt)}</li>
        <li><strong>End:</strong> ${fmtDate(event.endAt)}</li>
      </ul>
      ${extra}
    `
  };
}

function feedbackRequestEmail({ session, forRole, baseUrl }) {
  const link = `${baseUrl}/feedback?sessionId=${encodeURIComponent(session.id)}&role=${encodeURIComponent(forRole)}`;
  const who = forRole === 'student' ? 'your tutor' : 'your student';
  return {
    subject: 'Please share feedback for the session',
    html: `
      <p>We’d love your feedback on the last session.</p>
      <ul>
        <li><strong>Session ID:</strong> ${session.id}</li>
        <li><strong>Started:</strong> ${new Date(session.startedAt).toLocaleString()}</li>
        ${session.endedAt ? `<li><strong>Ended:</strong> ${new Date(session.endedAt).toLocaleString()}</li>` : ''}
      </ul>
      <p><a href="${link}">Leave feedback here</a>.</p>
      <p>(You can also open the app and find the session in your history.)</p>
    `
  };
}

module.exports = {
  verifyEmailTemplate,
  resetPasswordTemplate,
  purchaseConfirmationEmail,
  pendingReviewEmail,
  assignmentStudentEmail,
  assignmentTutorEmail,
  changeRequestReceivedEmail,
  changeRequestDecisionEmail,
  calendarProposedEmail,
  calendarStatusEmail,
  feedbackRequestEmail
};
