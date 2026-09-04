const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const sectionsController = require('../../controllers/admin/sections-controller');

const router = express.Router();

// Any admin access level may manage sections; unlike teachers/admins, there
// is no requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', sectionsController.createSection);
router.get('/', asyncHandler(sectionsController.listSections));
router.get('/:id', asyncHandler(sectionsController.getSectionById));
router.put('/:id', sectionsController.updateSection);
router.delete('/:id', sectionsController.deleteSection);

module.exports = router;
