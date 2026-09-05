const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const admissionsController = require('../../controllers/admin/admissions-controller');
const { accountCreationLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', asyncHandler(admissionsController.listApplications));
router.get('/:id', asyncHandler(admissionsController.getApplicationById));
router.put('/:id/status', asyncHandler(admissionsController.updateStatus));



router.post('/:id/accept', accountCreationLimiter, asyncHandler(admissionsController.acceptApplication));



router.delete(
  '/:id',
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
  asyncHandler(admissionsController.deleteApplication),
);

module.exports = router;
