const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const announcementsController = require('../../controllers/public/announcements-controller');

const router = express.Router();

// SECURITY: no authenticateToken — this is the school's public news feed.
// Read-only, and the controller restricts every query to target_role = 'all'.
// Managing announcements stays on /admin/announcements.
router.get('/', asyncHandler(announcementsController.listPublicAnnouncements));
router.get('/:id/image', asyncHandler(announcementsController.getPublicAnnouncementImage));

module.exports = router;
