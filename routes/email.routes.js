// routes/email.routes.js
const express = require('express');
const router = express.Router();
const { sendEmail, testEmailDelivery } = require('../services/emailService');
const { validate } = require('../middlewares/validate.middleware');
const Joi = require('joi');

// Validation schema for email sending
const sendEmailSchema = Joi.object({
  emailType: Joi.string().valid(
    'welcome',
    'session_reminder', 
    'support',
    'payment',
    'feedback',
    'change_request_approved',
    'change_request_rejected',
    'session_rescheduled',
    'email_verification',
    'password_reset',
    'wallet_request'
  ).required(),
  senderAccount: Joi.string().email().optional(),
  senderName: Joi.string().optional(),
  replyTo: Joi.string().email().optional(),
  allowsReplies: Joi.boolean().optional(),
  to: Joi.string().email().required(),
  subject: Joi.string().required(),
  template: Joi.string().required(),
  data: Joi.object().optional()
});

// Validation schema for test email
const testEmailSchema = Joi.object({
  testEmail: Joi.string().email().required()
});

// Send email endpoint
router.post('/send', validate(sendEmailSchema), async (req, res) => {
  try {
    const emailData = req.body;
    
    const result = await sendEmail(emailData);
    
    res.json({
      success: true,
      message: 'Email sent successfully',
      data: result
    });
    
  } catch (error) {
    console.error('[EMAIL ROUTE ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Test email delivery endpoint
router.post('/test', validate(testEmailSchema), async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    const results = await testEmailDelivery(testEmail);
    
    res.json({
      success: true,
      message: 'Test emails sent',
      data: results
    });
    
  } catch (error) {
    console.error('[TEST EMAIL ROUTE ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test emails',
      error: error.message
    });
  }
});

// Health check endpoint for email service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
