// controllers/purchases.controller.js
const purchaseService = require('../services/purchase.service');

async function create(req, res, next) {
  try {
    const purchase = await purchaseService.createPurchase(req.user.id, req.body);
    res.status(201).json({ purchase, message: 'Purchase created. Proceed to payment.' });
  } catch (e) { next(e); }
}

async function listMine(req, res, next) {
  try {
    const purchases = await purchaseService.listMyPurchases(req.user.id);
    res.json({ purchases });
  } catch (e) { next(e); }
}

module.exports = { create, listMine };
