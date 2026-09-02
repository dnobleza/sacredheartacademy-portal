const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('../utils/logger');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const buildHandler = (message) => (req, res) => {
  logger.warn(`Rate limit reached: ${req.method} ${req.originalUrl} from ${req.ip}`);
  return res.status(429).json({ success: false, message });
};

const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: buildHandler('Too many requests. Please try again later.'),
});

const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  handler: buildHandler('Too many login attempts. Please try again in 15 minutes.'),
});

const accountCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: buildHandler('Too many accounts created from this address. Please try again later.'),
});

module.exports = {
  generalLimiter,
  loginLimiter,
  accountCreationLimiter,
};
