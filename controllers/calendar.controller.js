// controllers/calendar.controller.js
const svc = require('../services/calendar.service');

async function list(req, res, next) {
  try {
    const data = await svc.listEvents(req.user, req.query);
    res.json({ events: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const ev = await svc.createEvent(req.user, req.body);
    res.status(201).json({ event: ev, message: 'Event proposed.' });
  } catch (e) { next(e); }
}

async function accept(req, res, next) {
  try {
    const ev = await svc.acceptEvent(req.user, req.params.id);
    res.json({ event: ev, message: 'Event accepted.' });
  } catch (e) { next(e); }
}

async function reject(req, res, next) {
  try {
    const ev = await svc.rejectEvent(req.user, req.params.id, req.body.reason);
    res.json({ event: ev, message: 'Event rejected.' });
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try {
    const result = await svc.cancelEvent(req.user, req.params.id, req.body);
    res.json({ 
      success: true,
      event: result.event, 
      message: 'Event cancelled.',
      walletOperation: result.walletOperation || null
    });
  } catch (e) { next(e); }
}

async function reschedule(req, res, next) {
  try {
    const ev = await svc.rescheduleEvent(req.user, req.params.id, req.body);
    res.json({ event: ev, message: 'Event rescheduled (new proposal).' });
  } catch (e) { next(e); }
}

async function createSeries(req, res, next) {
    try {
        const evts = await svc.createRecurringEvents(req.user, req.body);
        res.status(201).json({ events: evts, message: 'Series proposed.' });
    } catch (e) { next(e); }
}

module.exports = { list, create, accept, reject, cancel, reschedule, createSeries };