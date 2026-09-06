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
router.get(
  '/:id/documents/:documentId',
  asyncHandler(admissionsController.getApplicationDocument),
);
router.put('/:id/status', requireMinAccessLevel(ACCESS_LEVELS.REGISTRAR), asyncHandler(admissionsController.updateStatus));
router.put('/:id/return', requireMinAccessLevel(ACCESS_LEVELS.REGISTRAR), asyncHandler(admissionsController.returnApplication));



const requireRegistrar = requireMinAccessLevel(ACCESS_LEVELS.REGISTRAR);

router.post(
  '/:id/accept',
  requireRegistrar,
  accountCreationLimiter,
  asyncHandler(admissionsController.acceptApplication),
);



router.post('/:id/enroll', requireRegistrar, asyncHandler(admissionsController.enrollApplicant));



router.delete(
  '/:id',
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
  asyncHandler(admissionsController.deleteApplication),
);

module.exports = router;
