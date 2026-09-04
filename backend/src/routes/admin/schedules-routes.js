const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const schedulesController = require('../../controllers/admin/schedules-controller');

const router = express.Router();

// Any admin access level may manage schedules; unlike admin accounts, there
// is no requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', schedulesController.createSchedule);
router.get('/', asyncHandler(schedulesController.listSchedules));
router.get('/:id', asyncHandler(schedulesController.getScheduleById));
router.put('/:id', schedulesController.updateSchedule);
router.delete('/:id', schedulesController.deleteSchedule);

module.exports = router;
