const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const announcementsController = require('../../controllers/public/announcements-controller');

const router = express.Router();




router.get('/', asyncHandler(announcementsController.listPublicAnnouncements));
router.get('/:id/image', asyncHandler(announcementsController.getPublicAnnouncementImage));

module.exports = router;
