const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('../utils/logger');
const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const buildHandler = (message) => (req, res) => {
  logger.warn(`Rate limit reached: ${req.method} ${req.originalUrl} from ${req.ip}`);
  return sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, message);
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

// Called on every page load to swap the refresh cookie for an access token,
// so the ceiling is generous — it exists to blunt cookie brute-forcing, not
// to throttle normal use.
const refreshLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: buildHandler('Too many session refresh attempts. Please sign in again.'),
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
  refreshLimiter,
  accountCreationLimiter,
};
