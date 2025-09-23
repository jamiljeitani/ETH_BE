// routes/calendar.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/calendar.controller');
const { validate } = require('../middlewares/validate.middleware');
const schema = require('../validators/calendar.schema');

// list (student sees own; tutor sees own; admin can filter)
router.get('/events', validate(schema.listQuery, 'query'), ctrl.list);

// create proposal
router.post('/events', validate(schema.createEvent), ctrl.create);

// state changes
router.patch('/events/:id/accept', validate(schema.idParam, 'params'), ctrl.accept);
router.patch('/events/:id/reject', validate(schema.idParam, 'params'), validate(schema.reasonBody), ctrl.reject);
router.patch('/events/:id/cancel', validate(schema.idParam, 'params'), validate(schema.reasonBody), ctrl.cancel);
router.patch('/events/:id/reschedule', validate(schema.idParam, 'params'), validate(schema.rescheduleBody), ctrl.reschedule);
router.post('/events/series', validate(schema.createRecurring), ctrl.createSeries);


module.exports = router;
