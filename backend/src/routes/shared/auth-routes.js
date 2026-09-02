const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const authController = require('../../controllers/shared/auth-controller');

const router = express.Router();

router.post('/login', asyncHandler(authController.login));
router.post('/logout', authController.logout);

module.exports = router;
