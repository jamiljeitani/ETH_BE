// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const { notFound } = require('./middlewares/notFound.middleware');
const { errorHandler } = require('./middlewares/error.middleware');

// ⚠️ Controller import for direct webhook mount
const { stripeWebhook } = require('./controllers/payments.controller');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Stripe webhook needs the raw body, so mount this BEFORE express.json()
app.post(
  '/api/v1/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

// Regular parsers for everything else
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.use(rateLimit({ windowMs: 60 * 1000, max: 1000 }));

// health (root)
app.get('/health', (req, res) => res.json({ ok: true }));

// api
app.use('/api/v1', routes);

// 404 + error
app.use(notFound);
app.use(errorHandler);

module.exports = app;
