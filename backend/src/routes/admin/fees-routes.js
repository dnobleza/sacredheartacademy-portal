const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const feesController = require('../../controllers/admin/fees-controller');

const router = express.Router();




router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
);

router.get('/', asyncHandler(feesController.listFees));
router.get('/:id', asyncHandler(feesController.getFeeById));
router.post('/', feesController.createFee);
router.put('/:id', feesController.updateFee);
router.delete('/:id', asyncHandler(feesController.deleteFee));

module.exports = router;
