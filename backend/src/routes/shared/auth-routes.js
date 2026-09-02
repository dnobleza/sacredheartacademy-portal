const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const authController = require('../../controllers/shared/auth-controller');
const { loginLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.post('/logout', authController.logout);

module.exports = router;
