// scripts/sync-assigned-tutors.js
// Script to sync Assignment data to Purchase.assignedTutorId field

const { sequelize, Assignment, Purchase } = require('../models');

async function syncAssignedTutors() {
  try {
    console.log('🔄 Starting sync of assigned tutors...');
    
    // Get all assignments
    const assignments = await Assignment.findAll({
      include: [
        { 
          model: Purchase, 
          as: 'purchase', 
          attributes: ['id', 'assignedTutorId', 'status'] 
        }
      ]
    });
    
    console.log(`📊 Found ${assignments.length} assignments`);
    
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const assignment of assignments) {
      const purchase = assignment.purchase;
      
      if (!purchase) {
        console.log(`⚠️  Assignment ${assignment.id} has no associated purchase`);
        skippedCount++;
        continue;
      }
      
      if (purchase.assignedTutorId === assignment.tutorId) {
        console.log(`✅ Purchase ${purchase.id} already has correct assignedTutorId`);
        skippedCount++;
        continue;
      }
      
      // Update the purchase with the assigned tutor ID
      await Purchase.update(
        { assignedTutorId: assignment.tutorId },
        { where: { id: purchase.id } }
      );
      
      console.log(`🔄 Synced Purchase ${purchase.id} with Tutor ${assignment.tutorId}`);
      syncedCount++;
    }
    
    console.log('\n📈 Sync Summary:');
    console.log(`✅ Synced: ${syncedCount} purchases`);
    console.log(`⏭️  Skipped: ${skippedCount} purchases`);
    console.log(`📊 Total: ${assignments.length} assignments`);
    
    // Verify the sync
    console.log('\n🔍 Verifying sync...');
    const purchasesWithTutors = await Purchase.findAll({
      where: { assignedTutorId: { [require('sequelize').Op.ne]: null } },
      attributes: ['id', 'assignedTutorId', 'status']
    });
    
    console.log(`✅ ${purchasesWithTutors.length} purchases now have assigned tutors`);
    
  } catch (error) {
    console.error('❌ Error syncing assigned tutors:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncAssignedTutors()
    .then(() => {
      console.log('🎉 Sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncAssignedTutors };
