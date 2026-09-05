const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const messagesController = require('../../controllers/shared/messages-controller');
const authenticateToken = require('../../middleware/authenticate-token');

const router = express.Router();




router.use(authenticateToken);

router.get('/conversations', asyncHandler(messagesController.listConversations));
router.get('/recipients', asyncHandler(messagesController.listRecipients));
router.get('/unread-count', asyncHandler(messagesController.getUnreadCount));
router.get('/with/:userId', asyncHandler(messagesController.getThreadWithUser));
router.post('/', asyncHandler(messagesController.createMessage));
router.put('/:id', asyncHandler(messagesController.updateMessage));
router.delete('/:id', asyncHandler(messagesController.deleteMessage));

module.exports = router;
