// services/emailService.js
const nodemailer = require('nodemailer');
const cfg = require('../config/env');

// Email account configurations
const emailAccounts = {
  admin: {
    email: cfg.smtp.adminEmail || 'admin@elitetutorshub.net',
    password: cfg.smtp.adminPassword || 'fallback_password',
    name: 'Elite Tutors Hub Admin'
  },
  schedule: {
    email: cfg.smtp.scheduleEmail || 'schedule@elitetutorshub.net',
    password: cfg.smtp.schedulePassword || 'fallback_password',
    name: 'Elite Tutors Hub Schedule'
  },
  support: {
    email: cfg.smtp.supportEmail || 'support@elitetutorshub.net',
    password: cfg.smtp.supportPassword || 'fallback_password',
    name: 'Elite Tutors Hub Support'
  },
  finance: {
    email: cfg.smtp.financeEmail || 'finance@elitetutorshub.net',
    password: cfg.smtp.financePassword || 'fallback_password',
    name: 'Elite Tutors Hub Finance'
  },
  feedback: {
    email: cfg.smtp.feedbackEmail || 'feedback@elitetutorshub.net',
    password: cfg.smtp.feedbackPassword || 'fallback_password',
    name: 'Elite Tutors Hub Feedback'
  }
};

// Create transporters for each email account
const transporters = {};

function createTransporter(account) {
  return nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.secure,
    auth: {
      user: account.email,
      pass: account.password
    }
  });
}

// Initialize transporters
Object.keys(emailAccounts).forEach(key => {
  try {
    transporters[key] = createTransporter(emailAccounts[key]);
  } catch (error) {
    console.warn(`[EMAIL WARNING] Failed to create transporter for ${key}:`, error.message);
    // Create a fallback transporter for development
    transporters[key] = {
      async sendMail(opts) {
        console.log(`[DEV EMAIL FALLBACK - ${key}] To:`, opts.to);
        console.log(`[DEV EMAIL FALLBACK - ${key}] Subject:`, opts.subject);
        console.log(`[DEV EMAIL FALLBACK - ${key}] HTML:`, opts.html);
        return { messageId: `dev-fallback-${key}` };
      }
    };
  }
});

// Email type to sender account mapping
const emailTypeMapping = {
  welcome: 'admin',
  session_reminder: 'schedule',
  support: 'support',
  payment: 'finance',
  feedback: 'feedback',
  change_request_approved: 'admin',
  change_request_rejected: 'admin',
  session_rescheduled: 'schedule',
  email_verification: 'admin',
  password_reset: 'admin',
  wallet_request: 'finance'
};

// Get sender account based on email type or provided sender
function getSenderAccount(emailType, senderAccount) {
  if (senderAccount) {
    // Extract account type from email address
    const accountType = Object.keys(emailAccounts).find(key => 
      emailAccounts[key].email === senderAccount
    );
    return accountType || 'admin';
  }
  return emailTypeMapping[emailType] || 'admin';
}

// Generate email HTML from template and data
function generateEmailHTML(template, data = {}) {
  const templates = {
    welcome: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to Elite Tutors Hub!</h2>
        <p>Hello ${data.name || 'there'},</p>
        <p>Welcome to Elite Tutors Hub! We're excited to have you join our community of learners and educators.</p>
        <p>Your account has been successfully created and you can now start your learning journey.</p>
        <p>Best regards,<br>The Elite Tutors Hub Team</p>
      </div>
    `,
    session_reminder: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Session Reminder</h2>
        <p>Hello ${data.studentName || 'there'},</p>
        <p>This is a reminder that you have a tutoring session scheduled:</p>
        <ul>
          <li><strong>Subject:</strong> ${data.subject || 'N/A'}</li>
          <li><strong>Date:</strong> ${data.date || 'N/A'}</li>
          <li><strong>Time:</strong> ${data.time || 'N/A'}</li>
          <li><strong>Tutor:</strong> ${data.tutorName || 'N/A'}</li>
        </ul>
        <p>Please make sure you're ready for your session.</p>
        <p>Best regards,<br>Elite Tutors Hub Schedule Team</p>
      </div>
    `,
    support: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Support Request</h2>
        <p>Hello ${data.name || 'there'},</p>
        <p>Thank you for contacting Elite Tutors Hub support.</p>
        <p><strong>Your message:</strong></p>
        <p style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff;">
          ${data.message || 'No message provided'}
        </p>
        <p>We'll get back to you as soon as possible.</p>
        <p>Best regards,<br>Elite Tutors Hub Support Team</p>
      </div>
    `,
    payment_notification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Payment Notification</h2>
        <p>Hello ${data.name || 'there'},</p>
        <p>This is to confirm your payment details:</p>
        <ul>
          <li><strong>Amount:</strong> $${data.amount || '0.00'}</li>
          <li><strong>Date:</strong> ${data.date || 'N/A'}</li>
          <li><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</li>
          <li><strong>Status:</strong> ${data.status || 'Completed'}</li>
        </ul>
        <p>Thank you for your payment!</p>
        <p>Best regards,<br>Elite Tutors Hub Finance Team</p>
      </div>
    `,
    feedback_request: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Session Feedback Request</h2>
        <p>Hello ${data.studentName || 'there'},</p>
        <p>We hope you enjoyed your recent tutoring session with ${data.tutorName || 'your tutor'}.</p>
        <p>Your feedback is important to us and helps us improve our services. Please take a moment to share your experience.</p>
        <p><strong>Session Details:</strong></p>
        <ul>
          <li><strong>Subject:</strong> ${data.subject || 'N/A'}</li>
          <li><strong>Date:</strong> ${data.date || 'N/A'}</li>
        </ul>
        <p>Thank you for your time!</p>
        <p>Best regards,<br>Elite Tutors Hub Feedback Team</p>
      </div>
    `,
    change_request_approved: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Tutor Change Request Approved</h2>
        <p>Hello ${data.studentName || 'there'},</p>
        <p>Great news! Your request to change your tutor has been approved.</p>
        <p><strong>New Tutor:</strong> ${data.newTutorName || 'N/A'}</p>
        <p><strong>Subject:</strong> ${data.subject || 'N/A'}</p>
        <p>Your new tutor will contact you soon to schedule your sessions.</p>
        <p>Best regards,<br>Elite Tutors Hub Admin Team</p>
      </div>
    `,
    change_request_rejected: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Tutor Change Request Update</h2>
        <p>Hello ${data.studentName || 'there'},</p>
        <p>We regret to inform you that your tutor change request could not be approved at this time.</p>
        <p><strong>Reason:</strong> ${data.reason || 'No specific reason provided'}</p>
        <p>Please contact support if you have any questions or concerns.</p>
        <p>Best regards,<br>Elite Tutors Hub Admin Team</p>
      </div>
    `,
    session_rescheduled: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Session Rescheduled</h2>
        <p>Hello ${data.studentName || 'there'},</p>
        <p>Your tutoring session has been rescheduled.</p>
        <p><strong>New Schedule:</strong></p>
        <ul>
          <li><strong>Date:</strong> ${data.newDate || 'N/A'}</li>
          <li><strong>Time:</strong> ${data.newTime || 'N/A'}</li>
          <li><strong>Subject:</strong> ${data.subject || 'N/A'}</li>
          <li><strong>Tutor:</strong> ${data.tutorName || 'N/A'}</li>
        </ul>
        <p><strong>Reason:</strong> ${data.reason || 'No reason provided'}</p>
        <p>Best regards,<br>Elite Tutors Hub Schedule Team</p>
      </div>
    `,
    email_verification: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Email Verification</h2>
        <p>Hello ${data.name || 'there'},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationLink || '#'}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Verify Email Address
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.verificationLink || '#'}</p>
        <p>Best regards,<br>Elite Tutors Hub Team</p>
      </div>
    `,
    password_reset: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Password Reset Request</h2>
        <p>Hello ${data.name || 'there'},</p>
        <p>You requested to reset your password. Click the link below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink || '#'}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${data.resetLink || '#'}</p>
        <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>Elite Tutors Hub Team</p>
      </div>
    `,
    wallet_request: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Wallet Withdrawal Request</h2>
        <p>Hello ${data.tutorName || 'there'},</p>
        <p>Your wallet withdrawal request has been received:</p>
        <ul>
          <li><strong>Amount:</strong> $${data.amount || '0.00'}</li>
          <li><strong>Request Date:</strong> ${data.requestDate || 'N/A'}</li>
          <li><strong>Status:</strong> ${data.status || 'Pending'}</li>
        </ul>
        <p>We'll process your request within 2-3 business days.</p>
        <p>Best regards,<br>Elite Tutors Hub Finance Team</p>
      </div>
    `
  };

  return templates[template] || templates.welcome;
}

// Main email sending function
async function sendEmail(emailData) {
  try {
    const {
      emailType,
      senderAccount,
      senderName,
      replyTo,
      allowsReplies,
      to,
      subject,
      template,
      data = {}
    } = emailData;

    // Get the appropriate transporter
    const accountType = getSenderAccount(emailType, senderAccount);
    const transporter = transporters[accountType];
    const account = emailAccounts[accountType];

    if (!transporter) {
      throw new Error(`No transporter found for account type: ${accountType}`);
    }

    // Generate HTML content
    const html = generateEmailHTML(template, data);

    // Prepare email options
    const mailOptions = {
      from: {
        name: senderName || account.name,
        address: account.email
      },
      to: to,
      subject: subject,
      html: html
    };

    // Set reply-to header
    if (allowsReplies && replyTo) {
      mailOptions.replyTo = replyTo;
    } else if (!allowsReplies) {
      mailOptions.replyTo = cfg.smtp.noReplyEmail;
    }

    // Send email
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[EMAIL SENT] Type: ${emailType}, From: ${account.email}, To: ${to}, MessageId: ${result.messageId}`);
    
    return {
      success: true,
      messageId: result.messageId,
      from: account.email,
      to: to
    };

  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    
    // Fallback for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV EMAIL FALLBACK] Email Data:', emailData);
      return {
        success: true,
        messageId: 'dev-fallback',
        from: 'dev@localhost',
        to: emailData.to
      };
    }
    
    throw error;
  }
}

// Test email delivery for each account
async function testEmailDelivery(testEmail) {
  const results = {};
  
  for (const [accountType, account] of Object.entries(emailAccounts)) {
    try {
      const result = await sendEmail({
        emailType: 'support',
        senderAccount: account.email,
        senderName: account.name,
        replyTo: accountType === 'support' ? account.email : cfg.smtp.noReplyEmail,
        allowsReplies: accountType === 'support',
        to: testEmail,
        subject: `Test Email from ${account.name}`,
        template: 'support',
        data: {
          name: 'Test User',
          message: `This is a test email from the ${account.name} account to verify SMTP configuration.`
        }
      });
      
      results[accountType] = {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      results[accountType] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
}

module.exports = {
  sendEmail,
  testEmailDelivery,
  emailAccounts,
  emailTypeMapping
};
