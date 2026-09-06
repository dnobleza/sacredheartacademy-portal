const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');




const requireExactAccessLevel = (requiredLevel) => (req, res, next) => {
  if (!req.user || typeof req.user.accessLevel !== 'number') {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your session predates access levels. Please sign in again.',
    );
  }

  if (req.user.accessLevel !== requiredLevel) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'This area belongs to another access level.',
    );
  }

  return next();
};

module.exports = requireExactAccessLevel;
