const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireExactAccessLevel = require('../../middleware/require-exact-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const registrarDashboardController = require('../../controllers/admin/registrar-dashboard-controller');

const router = express.Router();

router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireExactAccessLevel(ACCESS_LEVELS.REGISTRAR),
);

router.get('/', asyncHandler(registrarDashboardController.getDashboard));

module.exports = router;
