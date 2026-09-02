const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

const authorizeRoles =
  (...roleNames) =>
  (req, res, next) => {
    if (!req.user || !roleNames.includes(req.user.role)) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'You do not have permission to access this resource.',
      );
    }

    return next();
  };

module.exports = authorizeRoles;
