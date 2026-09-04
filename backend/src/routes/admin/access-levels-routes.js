const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const accessLevelsController = require('../../controllers/admin/access-levels-controller');

const router = express.Router();

// Only Super Admin manages admin accounts, so only Super Admin needs the list
// of levels those accounts can hold.
router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
);

router.get('/', asyncHandler(accessLevelsController.listAdminAccessLevels));

module.exports = router;
