const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireExactAccessLevel = require('../../middleware/require-exact-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const enrollmentsController = require('../../controllers/admin/enrollments-controller');

const router = express.Router();




router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireExactAccessLevel(ACCESS_LEVELS.REGISTRAR),
);

router.get('/', asyncHandler(enrollmentsController.listEnrollments));
router.get('/sections', asyncHandler(enrollmentsController.listSectionCapacity));
router.post('/', asyncHandler(enrollmentsController.createEnrollment));
router.put('/:id', asyncHandler(enrollmentsController.moveEnrollment));
router.delete('/:id', asyncHandler(enrollmentsController.dropEnrollment));

module.exports = router;
