// routes/purchases.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/purchases.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/purchase.schema');

router.post('/', validate(schema.createPurchase), ctrl.create);
router.get('/', ctrl.listMine);

module.exports = router;
