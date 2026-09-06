const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');




const requireAccessLevelId = (requiredId) => (req, res, next) => {
  if (!req.user || typeof req.user.accessLevelId !== 'number') {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your session predates access levels. Please sign in again.',
    );
  }

  if (req.user.accessLevelId !== requiredId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'This area belongs to another access level.');
  }

  return next();
};

module.exports = requireAccessLevelId;
