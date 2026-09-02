const authorizeRoles = (...roleNames) => (req, res, next) => {
  if (!req.user || !roleNames.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
  }

  return next();
};

module.exports = authorizeRoles;
