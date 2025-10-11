// controllers/change-request.controller.js
const changeRequestService = require('../services/change-request.service');

// Student endpoints
async function createChangeRequest(req, res, next) {
  try {
    const { purchaseId, reason } = req.body;
    const studentId = req.user.id;
    
    const request = await changeRequestService.createRequest(studentId, { purchaseId, reason });
    
    res.status(201).json({
      success: true,
      message: 'Change tutor request submitted successfully',
      requestId: request.id
    });
  } catch (error) {
    next(error);
  }
}

async function listMyChangeRequests(req, res, next) {
  try {
    const studentId = req.user.id;
    const requests = await changeRequestService.listMyRequests(studentId);
    
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

// Admin endpoints
async function listAllChangeRequests(req, res, next) {
  try {
    const { status } = req.query;
    const requests = await changeRequestService.listAll(status);
    
    // Transform the response to match the required format
    const transformedRequests = requests.map(request => ({
      id: request.id,
      purchaseId: request.purchaseId,
      studentId: request.studentId,
      student: {
        user: {
          email: request.student?.email,
          fullName: request.student?.studentProfile?.fullName
        }
      },
      currentTutor: {
        user: {
          email: request.currentTutor?.email,
          fullName: request.currentTutor?.tutorProfile?.fullName
        }
      },
      reason: request.reason,
      status: request.status,
      approvalNote: request.approvalNote,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));
    
    res.json({ requests: transformedRequests });
  } catch (error) {
    next(error);
  }
}

async function handleChangeRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { decision, note, reason } = req.body;
    const adminId = req.user.id;
    
    let result;
    if (decision === 'approve') {
      result = await changeRequestService.approveRequest(adminId, id, note);
    } else if (decision === 'reject') {
      result = await changeRequestService.rejectRequest(adminId, id, reason);
    } else {
      const error = new Error('Invalid decision. Must be "approve" or "reject"');
      error.status = 400;
      throw error;
    }
    
    res.json({
      success: true,
      message: `Change request ${decision}ed successfully`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createChangeRequest,
  listMyChangeRequests,
  listAllChangeRequests,
  handleChangeRequest
};
