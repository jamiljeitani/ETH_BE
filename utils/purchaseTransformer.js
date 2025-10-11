// utils/purchaseTransformer.js
// Utility to transform purchase data to include assignedTutor in the correct format

function transformPurchaseData(purchase) {
  if (!purchase) return null;
  
  const purchaseData = purchase.toJSON ? purchase.toJSON() : purchase;
  
  // Transform assignedTutor data to match expected format
  if (purchaseData.assignedTutor) {
    purchaseData.assignedTutor = {
      id: purchaseData.assignedTutor.id,
      user: {
        fullName: purchaseData.assignedTutor.tutorProfile?.fullName || 'Unknown',
        email: purchaseData.assignedTutor.email
      }
    };
  }
  
  return purchaseData;
}

function transformPurchasesData(purchases) {
  if (!Array.isArray(purchases)) {
    return transformPurchaseData(purchases);
  }
  
  return purchases.map(transformPurchaseData);
}

module.exports = {
  transformPurchaseData,
  transformPurchasesData
};
