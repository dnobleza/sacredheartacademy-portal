const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireMinAccessLevel = require('../../middleware/require-min-access-level');
const { ACCESS_LEVELS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const adminsController = require('../../controllers/admin/admins-controller');
const { accountCreationLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

// Managing admin accounts is Super Admin only.
const superAdminOnly = requireMinAccessLevel(ACCESS_LEVELS.SUPER_ADMIN);

router.post('/', superAdminOnly, accountCreationLimiter, adminsController.createAdmin);
router.get('/', superAdminOnly, asyncHandler(adminsController.listAdmins));
router.get('/:id', superAdminOnly, asyncHandler(adminsController.getAdminById));

// The exception: every admin reaches this route to edit their own profile.
// updateAdmin carries the other half of the rule and requires Super Admin to
// edit anyone else's record.
router.put('/:id', adminsController.updateAdmin);

router.delete('/:id', superAdminOnly, adminsController.deleteAdmin);

module.exports = router;
