const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const financialController = require('../../controllers/shared/financial-controller');
const declarationsController = require('../../controllers/shared/declarations-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('student'));




router.get('/account', asyncHandler(financialController.getMyAccount));




router.post('/payments/declare', asyncHandler(declarationsController.declarePayment));
router.get('/payments', asyncHandler(declarationsController.listMyDeclarations));

module.exports = router;
