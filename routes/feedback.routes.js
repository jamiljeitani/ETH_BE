// routes/feedback.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/feedback.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/feedback.schema');

router.post('/', validate(schema.create), ctrl.create);

module.exports = router;
