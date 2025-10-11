// routes/purchases.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/purchases.controller');
const changeRequestCtrl = require('../controllers/change-request.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/purchase.schema');
const changeRequestSchema = require('../validators/change-request.schema');

router.post('/', validate(schema.createPurchase), ctrl.create);
router.get('/', ctrl.listMine);

// Change tutor request routes
router.post('/change-tutor-request', validate(changeRequestSchema.createChangeRequest), changeRequestCtrl.createChangeRequest);
router.get('/change-tutor-requests', changeRequestCtrl.listMyChangeRequests);

module.exports = router;
