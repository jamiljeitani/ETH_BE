// routes/lookups.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/lookups.controller');

router.get('/languages', ctrl.languages);
router.get('/subjects', ctrl.subjects);
router.get('/grades', ctrl.grades);
router.get('/bac-types', ctrl.bacTypes);
router.get('/tutor-ranks', ctrl.tutorRanks);
router.get('/sessions', ctrl.sessions);     
router.get('/bundles', ctrl.bundles);

module.exports = router;
