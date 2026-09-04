const HTTP_STATUS = require('../utils/http-status');
const { sendError } = require('../utils/send-response');

/**
 * Gates a route on the caller's access level. Runs after authenticateToken and
 * authorizeRoles: the role decides which portal you are in, the level decides
 * how much of it you can use.
 *
 * A missing accessLevel claim is a denial, never a zero. Tokens issued before
 * access levels shipped carry no claim, and treating those as the lowest tier
 * would grant Lvl-0 access instead of refusing it. Those sessions get a 403
 * here until the user signs in again.
 */
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
