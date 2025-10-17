# Hostinger SMTP Email Integration

This document describes the implementation of Hostinger SMTP email accounts integration into the Elite Tutors Hub backend.

## Overview

The email system has been updated to support multiple Hostinger email accounts with proper routing and template management. The frontend can now send emails through the new `/email/send` endpoint with structured payloads.

## Files Created/Modified

### New Files
- `services/emailService.js` - Main email service with Hostinger SMTP transporters
- `routes/email.routes.js` - Email API routes
- `test-email-service.js` - Test script for email functionality
- `HOSTINGER_EMAIL_INTEGRATION.md` - This documentation

### Modified Files
- `config/env.js` - Added Hostinger SMTP configuration
- `routes/index.js` - Added email routes

## Email Accounts

The system supports 5 Hostinger email accounts:

| Account Type | Email Address | Purpose | Allows Replies |
|--------------|---------------|---------|----------------|
| Admin | admin@elitetutorshub.net | General admin emails, welcome, verification | Yes (via support@) |
| Schedule | schedule@elitetutorshub.net | Session reminders, rescheduling | No |
| Support | support@elitetutorshub.net | Support requests, customer service | Yes |
| Finance | finance@elitetutorshub.net | Payment notifications, wallet requests | No |
| Feedback | feedback@elitetutorshub.net | Feedback requests, surveys | No |

## Environment Variables

Add these variables to your `.env` file:

```env
# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true

# Hostinger Email Accounts
SMTP_ADMIN_EMAIL=admin@elitetutorshub.net
SMTP_ADMIN_PASSWORD=n*1YqDNJ

SMTP_SCHEDULE_EMAIL=schedule@elitetutorshub.net
SMTP_SCHEDULE_PASSWORD=hk?Wa1X$

SMTP_SUPPORT_EMAIL=support@elitetutorshub.net
SMTP_SUPPORT_PASSWORD=7t^MwabXJ;r&

SMTP_FINANCE_EMAIL=finance@elitetutorshub.net
SMTP_FINANCE_PASSWORD=6I&2xXLuy&5O

SMTP_FEEDBACK_EMAIL=feedback@elitetutorshub.net
SMTP_FEEDBACK_PASSWORD=C11U>&2On!

NO_REPLY_EMAIL=no-reply@elitetutorshub.net
```

## API Endpoints

### POST /api/v1/email/send

Send an email using the new structured format.

**Request Body:**
```json
{
  "emailType": "welcome|session_reminder|support|payment|feedback|change_request_approved|change_request_rejected|session_rescheduled|email_verification|password_reset|wallet_request",
  "senderAccount": "admin@elitetutorshub.net|schedule@elitetutorshub.net|support@elitetutorshub.net|finance@elitetutorshub.net|feedback@elitetutorshub.net",
  "senderName": "Elite Tutors Hub Admin|Schedule|Support|Finance|Feedback",
  "replyTo": "support@elitetutorshub.net|no-reply@elitetutorshub.net",
  "allowsReplies": true|false,
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "template": "template_name",
  "data": {
    "name": "John Doe",
    "message": "Custom data for template"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "messageId": "email_message_id",
    "from": "sender@elitetutorshub.net",
    "to": "recipient@example.com"
  }
}
```

### POST /api/v1/email/test

Test email delivery from all accounts.

**Request Body:**
```json
{
  "testEmail": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test emails sent",
  "data": {
    "admin": {
      "success": true,
      "messageId": "message_id"
    },
    "schedule": {
      "success": true,
      "messageId": "message_id"
    },
    // ... other accounts
  }
}
```

### GET /api/v1/email/health

Check email service health.

**Response:**
```json
{
  "success": true,
  "message": "Email service is running",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## Email Templates

The system includes pre-built templates for:

1. **welcome** - Welcome new users
2. **session_reminder** - Remind users of upcoming sessions
3. **support** - Support request confirmations
4. **payment_notification** - Payment confirmations
5. **feedback_request** - Request feedback after sessions
6. **change_request_approved** - Tutor change approved
7. **change_request_rejected** - Tutor change rejected
8. **session_rescheduled** - Session rescheduling notifications
9. **email_verification** - Email verification links
10. **password_reset** - Password reset links
11. **wallet_request** - Wallet withdrawal requests

## Email Type to Account Mapping

The system automatically maps email types to appropriate sender accounts:

- `welcome`, `email_verification`, `password_reset`, `change_request_*` → **admin@**
- `session_reminder`, `session_rescheduled` → **schedule@**
- `support` → **support@**
- `payment`, `wallet_request` → **finance@**
- `feedback` → **feedback@**

## Testing

### Manual Testing

1. Update the test email address in `test-email-service.js`
2. Run the test script:
   ```bash
   node test-email-service.js
   ```
3. Check your email inbox and Hostinger webmail for delivered emails

### API Testing

Use the `/email/test` endpoint to test all accounts at once:

```bash
curl -X POST http://localhost:4000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-test-email@example.com"}'
```

## Frontend Integration

The frontend can now send emails using the new endpoint structure. Example frontend code:

```javascript
const sendEmail = async (emailData) => {
  const response = await fetch('/api/v1/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  });
  
  return response.json();
};

// Example usage
await sendEmail({
  emailType: 'welcome',
  to: 'user@example.com',
  subject: 'Welcome to Elite Tutors Hub!',
  template: 'welcome',
  data: {
    name: 'John Doe'
  }
});
```

## Error Handling

The email service includes comprehensive error handling:

- **Development Mode**: Falls back to console logging if SMTP fails
- **Production Mode**: Throws errors for proper error handling
- **Validation**: Input validation using Joi schemas
- **Logging**: Detailed logging for debugging

## Security Considerations

- SMTP credentials are stored in environment variables
- Email validation prevents injection attacks
- Reply-to headers are properly configured
- No-reply emails prevent accidental replies

## Troubleshooting

### Common Issues

1. **SMTP Authentication Failed**
   - Verify credentials in `.env` file
   - Check Hostinger email account settings
   - Ensure 2FA is disabled for SMTP

2. **Emails Not Delivered**
   - Check spam folder
   - Verify recipient email address
   - Check Hostinger webmail for sent items

3. **Template Not Found**
   - Verify template name matches available templates
   - Check template data structure

### Debug Mode

Set `NODE_ENV=development` to enable debug logging and fallback email handling.

## Migration from Legacy Email

The new email service is backward compatible. Existing email functionality will continue to work while new features use the enhanced system.

## Support

For issues with the email integration:

1. Check the logs for detailed error messages
2. Verify environment variables are correctly set
3. Test individual email accounts using the test endpoint
4. Contact Hostinger support for SMTP-related issues
