const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const profileController = require('../../controllers/teachers/profile-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('teacher'));

// No :id — the teacher edited is always the one the token identifies.
router.get('/', asyncHandler(profileController.getProfile));
router.put('/', asyncHandler(profileController.updateProfile));

module.exports = router;
