const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const gradeLevelsController = require('../../controllers/admin/grade-levels-controller');

const router = express.Router();

// Any admin access level may manage grade levels; unlike teachers/admins,
// there is no requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', gradeLevelsController.createGradeLevel);
router.get('/', asyncHandler(gradeLevelsController.listGradeLevels));
router.get('/:id', asyncHandler(gradeLevelsController.getGradeLevelById));
router.put('/:id', gradeLevelsController.updateGradeLevel);
router.delete('/:id', gradeLevelsController.deleteGradeLevel);

module.exports = router;
