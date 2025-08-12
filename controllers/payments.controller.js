// controllers/payments.controller.js
const paymentService = require('../services/payment.service');

async function confirm(req, res, next) {
  try {
    const { purchaseId } = req.params;
    const result = await paymentService.confirmPayment(req.user.id, purchaseId, req.body);
    res.json({ ...result, message: 'Payment recorded.' });
  } catch (e) { next(e); }
}

module.exports = { confirm };
