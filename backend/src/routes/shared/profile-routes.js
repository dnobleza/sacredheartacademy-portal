const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const asyncHandler = require('../../utils/async-handler');
const profileController = require('../../controllers/shared/profile-controller');

const router = express.Router();




router.use(authenticateToken);

router.get('/', asyncHandler(profileController.getMyProfile));
router.put('/', asyncHandler(profileController.updateMyProfile));

module.exports = router;
