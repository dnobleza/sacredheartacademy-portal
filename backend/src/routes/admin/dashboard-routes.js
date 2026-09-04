const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const dashboardController = require('../../controllers/admin/dashboard-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', asyncHandler(dashboardController.getDashboard));

module.exports = router;
