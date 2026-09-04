const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const authController = require('../../controllers/shared/auth-controller');
const authenticateToken = require('../../middleware/authenticate-token');
const { loginLimiter, refreshLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.post('/login', loginLimiter, asyncHandler(authController.login));
router.post('/refresh', refreshLimiter, asyncHandler(authController.refresh));
router.get('/me', authenticateToken, asyncHandler(authController.me));
router.post('/logout', asyncHandler(authController.logout));

module.exports = router;
