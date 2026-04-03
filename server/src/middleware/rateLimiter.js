'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for auth endpoints.
 * Restricts to 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' });
  },
});

module.exports = { authLimiter };
