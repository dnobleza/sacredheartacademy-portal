const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const schedulesController = require('../../controllers/admin/schedules-controller');

const router = express.Router();






router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
);

router.post('/', schedulesController.createSchedule);
router.get('/', asyncHandler(schedulesController.listSchedules));
router.get('/:id', asyncHandler(schedulesController.getScheduleById));
router.put('/:id', schedulesController.updateSchedule);
router.delete('/:id', schedulesController.deleteSchedule);

module.exports = router;
