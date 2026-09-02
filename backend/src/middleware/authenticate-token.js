const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Authentication token is required.');
  }

  return jwt.verify(token, env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired token.');
    }

    req.user = decoded;
    return next();
  });
};

module.exports = authenticateToken;
