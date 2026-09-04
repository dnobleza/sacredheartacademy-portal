const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const classesController = require('../../controllers/admin/classes-controller');

const router = express.Router();

// Any admin access level may manage advisory classes; no requireMinAccessLevel gate.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', classesController.createAdvisoryClass);
router.get('/', asyncHandler(classesController.listAdvisoryClasses));
router.get('/:id', asyncHandler(classesController.getAdvisoryClassById));
router.put('/:id', classesController.updateAdvisoryClass);
router.delete('/:id', classesController.deleteAdvisoryClass);

module.exports = router;
