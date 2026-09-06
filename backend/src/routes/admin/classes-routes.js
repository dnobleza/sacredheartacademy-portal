const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const classesController = require('../../controllers/admin/classes-controller');

const router = express.Router();





router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN),
);

router.post('/', classesController.createAdvisoryClass);
router.get('/', asyncHandler(classesController.listAdvisoryClasses));
router.get('/:id', asyncHandler(classesController.getAdvisoryClassById));
router.put('/:id', classesController.updateAdvisoryClass);
router.delete('/:id', classesController.deleteAdvisoryClass);

module.exports = router;
