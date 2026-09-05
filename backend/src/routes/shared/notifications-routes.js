const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const notificationsController = require('../../controllers/shared/notifications-controller');
const authenticateToken = require('../../middleware/authenticate-token');

const router = express.Router();



router.use(authenticateToken);

router.get('/', asyncHandler(notificationsController.listNotifications));
router.put('/read-all', asyncHandler(notificationsController.markAllRead));
router.put('/:id/read', asyncHandler(notificationsController.markRead));

module.exports = router;
