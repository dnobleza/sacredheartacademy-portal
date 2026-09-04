const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const messagesController = require('../../controllers/shared/messages-controller');
const authenticateToken = require('../../middleware/authenticate-token');

const router = express.Router();

// No authorizeRoles here on purpose: messaging is not role-gated, every role
// (admin, teacher, student, parent) uses the same endpoints once their
// portals exist. Only authentication is required.
router.use(authenticateToken);

router.get('/conversations', asyncHandler(messagesController.listConversations));
router.get('/recipients', asyncHandler(messagesController.listRecipients));
router.get('/with/:userId', asyncHandler(messagesController.getThreadWithUser));
router.post('/', asyncHandler(messagesController.createMessage));

module.exports = router;
