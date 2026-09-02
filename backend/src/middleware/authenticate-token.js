const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication token is required.' });
  }

  return jwt.verify(token, env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    req.user = decoded;
    return next();
  });
};

module.exports = authenticateToken;
