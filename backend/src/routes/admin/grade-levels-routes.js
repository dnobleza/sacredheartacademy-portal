const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const gradeLevelsController = require('../../controllers/admin/grade-levels-controller');

const router = express.Router();



router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', gradeLevelsController.createGradeLevel);
router.get('/', asyncHandler(gradeLevelsController.listGradeLevels));
router.get('/:id', asyncHandler(gradeLevelsController.getGradeLevelById));
router.put('/:id', gradeLevelsController.updateGradeLevel);
router.delete('/:id', gradeLevelsController.deleteGradeLevel);

module.exports = router;
