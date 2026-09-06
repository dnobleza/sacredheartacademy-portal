const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const gradeLevelsController = require('../../controllers/admin/grade-levels-controller');

const router = express.Router();






router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
);

router.post('/', gradeLevelsController.createGradeLevel);
router.get('/', asyncHandler(gradeLevelsController.listGradeLevels));
router.get('/:id', asyncHandler(gradeLevelsController.getGradeLevelById));
router.put('/:id', gradeLevelsController.updateGradeLevel);
router.delete('/:id', gradeLevelsController.deleteGradeLevel);

module.exports = router;
