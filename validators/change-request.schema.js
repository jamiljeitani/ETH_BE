// validators/change-request.schema.js
const Joi = require('joi');

const createChangeRequest = Joi.object({
  purchaseId: Joi.string().uuid().required().messages({
    'string.uuid': 'Purchase ID must be a valid UUID',
    'any.required': 'Purchase ID is required'
  }),
  reason: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Reason cannot exceed 1000 characters'
  })
});

const decisionChangeRequest = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required().messages({
    'any.only': 'Decision must be either "approve" or "reject"',
    'any.required': 'Decision is required'
  }),
  note: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Note cannot exceed 1000 characters'
  }),
  reason: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Reason cannot exceed 1000 characters'
  })
}).custom((value, helpers) => {
  // If decision is approve, note is optional but reason should not be provided
  if (value.decision === 'approve' && value.reason) {
    return helpers.error('custom.approveWithReason');
  }
  
  // If decision is reject, reason is optional but note should not be provided
  if (value.decision === 'reject' && value.note) {
    return helpers.error('custom.rejectWithNote');
  }
  
  return value;
}).messages({
  'custom.approveWithReason': 'Cannot provide reason when approving a request',
  'custom.rejectWithNote': 'Cannot provide note when rejecting a request'
});

const idParam = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'ID must be a valid UUID',
    'any.required': 'ID is required'
  })
});

const queryChangeRequests = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'all').optional().messages({
    'any.only': 'Status must be one of: pending, approved, rejected, all'
  })
});

module.exports = {
  createChangeRequest,
  decisionChangeRequest,
  idParam,
  queryChangeRequests
};
