// controllers/purchases.controller.js
const purchaseService = require('../services/purchase.service');
const { transformPurchasesData, transformPurchaseData } = require('../utils/purchaseTransformer');

async function create(req, res, next) {
  try {
    const purchase = await purchaseService.createPurchase(req.user.id, req.body);
    const transformedPurchase = transformPurchaseData(purchase);
    res.status(201).json({ purchase: transformedPurchase, message: 'Purchase created. Proceed to payment.' });
  } catch (e) { next(e); }
}

async function listMine(req, res, next) {
  try {
    const purchases = await purchaseService.listMyPurchases(req.user.id);
    const transformedPurchases = transformPurchasesData(purchases);
    res.json({ purchases: transformedPurchases });
  } catch (e) { next(e); }
}


module.exports = { create, listMine};
