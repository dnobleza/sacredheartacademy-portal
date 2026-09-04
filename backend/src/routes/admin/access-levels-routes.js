const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const accessLevelsController = require('../../controllers/admin/access-levels-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', asyncHandler(accessLevelsController.listAdminAccessLevels));

module.exports = router;
