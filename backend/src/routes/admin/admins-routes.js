const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const adminsController = require('../../controllers/admin/admins-controller');
const { accountCreationLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', accountCreationLimiter, adminsController.createAdmin);
router.get('/', asyncHandler(adminsController.listAdmins));
router.get('/:id', asyncHandler(adminsController.getAdminById));
router.put('/:id', adminsController.updateAdmin);
router.delete('/:id', adminsController.deleteAdmin);

module.exports = router;
