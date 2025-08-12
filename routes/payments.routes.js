// routes/payments.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/payments.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/payment.schema');

router.post('/:purchaseId/confirm', validate(schema.idParam, 'params'), validate(schema.confirmPayment), ctrl.confirm);

module.exports = router;
