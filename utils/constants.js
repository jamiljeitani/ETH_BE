// utils/constants.js
module.exports = {
  ROLES: { ADMIN: 'admin', STUDENT: 'student', TUTOR: 'tutor' },
  USER_STATUS: { ACTIVE: 'active', DISABLED: 'disabled' },
  PAYMENT_METHODS: ['visa', 'mastercard', 'omt', 'whish', 'suyool', 'wu'],
  PAYMENT_STATUS: ['pending', 'succeeded', 'failed', 'manual_review'],
  PURCHASE_STATUS: ['pending', 'active', 'pending_review', 'cancelled'],

  EVENT_TYPES: ['session', 'exam', 'target', 'other'],
  EVENT_STATUS: ['proposed', 'accepted', 'rejected', 'cancelled', 'rescheduled'],
  LOCATION_TYPES: ['online', 'in-person']
};
