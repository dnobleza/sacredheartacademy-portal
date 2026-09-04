const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const announcementsController = require('../../controllers/admin/announcements-controller');

const router = express.Router();

// Any admin access level may manage announcements; there is no
// requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', announcementsController.createAnnouncement);
router.get('/', asyncHandler(announcementsController.listAnnouncements));
router.get('/:id', asyncHandler(announcementsController.getAnnouncementById));
router.put('/:id', announcementsController.updateAnnouncement);
router.delete('/:id', announcementsController.deleteAnnouncement);

module.exports = router;
