const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');


const requireMinAccessLevel = (minimumLevel) => (req, res, next) => {
  if (!req.user || typeof req.user.accessLevel !== 'number') {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your session predates access levels. Please sign in again.',
    );
  }

  if (req.user.accessLevel < minimumLevel) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your access level is not high enough for this action.',
    );
  }

  return next();
};

module.exports = requireMinAccessLevel;
