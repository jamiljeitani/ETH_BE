// server/routes/sessions.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sessions.controller');

// Timer lifecycle
router.post('/start', ctrl.start);
router.post('/:id/pause', ctrl.pause);
router.post('/:id/resume', ctrl.resume);
router.post('/:id/end', ctrl.end);

// Query
router.get('/my', ctrl.listMine);                    // <-- NEW
router.get('/assigned-purchases', ctrl.assigned);    // <-- NEW
router.get('/:id', ctrl.getOne);

module.exports = router;
