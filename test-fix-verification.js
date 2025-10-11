// Simple test to verify the FOR UPDATE fix
const { sequelize, TutorChangeRequest, User } = require('./models');
const changeRequestService = require('./services/change-request.service');

async function testFix() {
  try {
    console.log('🧪 Testing FOR UPDATE fix...');
    
    // Find a pending change request
    const pendingRequest = await TutorChangeRequest.findOne({
      where: { status: 'pending' }
    });
    
    if (!pendingRequest) {
      console.log('❌ No pending change requests found');
      return;
    }
    
    console.log(`📊 Found pending request: ${pendingRequest.id}`);
    
    // Find an admin user
    const admin = await User.findOne({
      where: { role: 'admin' },
      attributes: ['id', 'email']
    });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`👤 Using admin: ${admin.email}`);
    
    // Test reject functionality
    console.log('🔄 Testing reject functionality...');
    try {
      const result = await changeRequestService.rejectRequest(
        admin.id, 
        pendingRequest.id, 
        'Test rejection - FOR UPDATE fix verification'
      );
      
      console.log('✅ Reject request successful!');
      console.log(`📋 New status: ${result.status}`);
      console.log(`📋 Rejection reason: ${result.rejectionReason}`);
      
    } catch (error) {
      console.error('❌ Reject request failed:', error.message);
      if (error.message.includes('FOR UPDATE cannot be applied')) {
        console.error('🚨 FOR UPDATE error still exists!');
      }
      throw error;
    }
    
    console.log('🎉 FOR UPDATE fix is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

testFix();
