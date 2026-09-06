const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const financialController = require('../../controllers/shared/financial-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('parent'));

router.get('/children', asyncHandler(financialController.listChildren));




router.get('/children/:studentId/account', asyncHandler(financialController.getChildAccount));

module.exports = router;
