const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const notificationsController = require('../../controllers/shared/notifications-controller');
const authenticateToken = require('../../middleware/authenticate-token');

const router = express.Router();

// No authorizeRoles: every role reads its own notifications through the same
// endpoints. Only authentication is required.
router.use(authenticateToken);

router.get('/', asyncHandler(notificationsController.listNotifications));
router.put('/read-all', asyncHandler(notificationsController.markAllRead));
router.put('/:id/read', asyncHandler(notificationsController.markRead));

module.exports = router;
