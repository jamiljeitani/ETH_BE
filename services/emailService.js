const nodemailer = require('nodemailer');

// Email account configurations
const EMAIL_ACCOUNTS = {
  admin: {
    email: process.env.SMTP_ADMIN_EMAIL,
    password: process.env.SMTP_ADMIN_PASSWORD,
    name: 'Elite Tutors Hub Admin'
  },
  schedule: {
    email: process.env.SMTP_SCHEDULE_EMAIL,
    password: process.env.SMTP_SCHEDULE_PASSWORD,
    name: 'Elite Tutors Hub Schedule'
  },
  support: {
    email: process.env.SMTP_SUPPORT_EMAIL,
    password: process.env.SMTP_SUPPORT_PASSWORD,
    name: 'Elite Tutors Hub Support'
  },
  finance: {
    email: process.env.SMTP_FINANCE_EMAIL,
    password: process.env.SMTP_FINANCE_PASSWORD,
    name: 'Elite Tutors Hub Finance'
  },
  feedback: {
    email: process.env.SMTP_FEEDBACK_EMAIL,
    password: process.env.SMTP_FEEDBACK_PASSWORD,
    name: 'Elite Tutors Hub Feedback'
  }
};

// Create transporter for each account
const createTransporter = (account) => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: account.email,
      pass: account.password
    }
  });
};

// Simple template rendering
const renderTemplate = (templateName, data) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.subject || 'Email from Elite Tutors Hub'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #051565, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .data-section { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #051565; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Elite Tutors Hub</h1>
          <p>${data.subject || 'Important Notification'}</p>
        </div>
        <div class="content">
          <h2>Hello ${data.recipientName || 'User'}!</h2>
          <p>This is an automated email from Elite Tutors Hub.</p>
          
          <div class="data-section">
            <h3>Email Details:</h3>
            <pre style="white-space: pre-wrap; font-family: monospace; background: #f1f5f9; padding: 10px; border-radius: 4px;">${JSON.stringify(data, null, 2)}</pre>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>© 2024 Elite Tutors Hub. All rights reserved.</p>
          <p>This email was sent from ${data.senderAccount || 'Elite Tutors Hub'}</p>
        </div>
      </body>
    </html>
  `;
};

// Send email function
const sendEmail = async (emailData) => {
  const { senderAccount, senderName, replyTo, allowsReplies, to, subject, template, data } = emailData;
  
  // Find the account configuration
  const accountKey = Object.keys(EMAIL_ACCOUNTS).find(key => 
    EMAIL_ACCOUNTS[key].email === senderAccount
  );
  
  if (!accountKey) {
    throw new Error(`Unknown sender account: ${senderAccount}`);
  }
  
  const account = EMAIL_ACCOUNTS[accountKey];
  const transporter = createTransporter(account);
  
  // Prepare email options
  const mailOptions = {
    from: `"${senderName}" <${account.email}>`,
    to: to,
    subject: subject,
    replyTo: replyTo,
    html: renderTemplate(template, { ...data, senderAccount, subject }),
    text: `${subject}\n\n${JSON.stringify(data, null, 2)}\n\n---\nElite Tutors Hub`
  };
  
  // Send email
  const result = await transporter.sendMail(mailOptions);
  
  // Log email event (without exposing passwords)
  console.log(`📧 Email sent successfully:`, {
    messageId: result.messageId,
    from: account.email,
    to: to,
    subject: subject,
    template: template,
    timestamp: new Date().toISOString()
  });
  
  return result;
};

// Test email function
const testEmailConnection = async () => {
  try {
    console.log('🔍 Testing email connections...');
    
    for (const [accountKey, account] of Object.entries(EMAIL_ACCOUNTS)) {
      try {
        const transporter = createTransporter(account);
        await transporter.verify();
        console.log(`✅ ${accountKey} account (${account.email}) - Connection successful`);
      } catch (error) {
        console.error(`❌ ${accountKey} account (${account.email}) - Connection failed:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Email connection test failed:', error);
  }
};

// Test email delivery for each account (compatible with existing routes)
const testEmailDelivery = async (testEmail) => {
  const results = {};
  
  for (const [accountKey, account] of Object.entries(EMAIL_ACCOUNTS)) {
    try {
      const result = await sendEmail({
        emailType: 'support',
        senderAccount: account.email,
        senderName: account.name,
        replyTo: accountKey === 'support' ? account.email : process.env.NO_REPLY_EMAIL,
        allowsReplies: accountKey === 'support',
        to: testEmail,
        subject: `Test Email from ${account.name}`,
        template: 'support',
        data: {
          name: 'Test User',
          message: `This is a test email from the ${account.name} account to verify SMTP configuration.`
        }
      });
      
      results[accountKey] = {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      results[accountKey] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
};

module.exports = { sendEmail, testEmailConnection, testEmailDelivery };