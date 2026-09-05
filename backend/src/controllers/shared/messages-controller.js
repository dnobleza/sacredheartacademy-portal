const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateMessage,
  validateUpdateMessage,
} = require('../../validations/message-validation');
const { notifyUser } = require('../../utils/notifications');
















const NAME_EXPR = `
  COALESCE(
    NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
    NULLIF(CONCAT_WS(' ', teachers.first_name, teachers.last_name), ''),
    NULLIF(CONCAT_WS(' ', students.first_name, students.last_name), ''),
    NULLIF(CONCAT_WS(' ', parents.first_name, parents.last_name), ''),
    users.email
  )
`;

const PROFILE_JOINS = `
  JOIN roles ON roles.id = users.role_id
  LEFT JOIN admins ON admins.user_id = users.id
  LEFT JOIN teachers ON teachers.user_id = users.id
  LEFT JOIN students ON students.user_id = users.id
  LEFT JOIN parents ON parents.user_id = users.id
`;


const listConversations = async (req, res) => {
  const callerId = req.user.userId;

  const [rows] = await pool.execute(
    `SELECT
       users.id AS user_id,
       ${NAME_EXPR} AS name,
       roles.name AS role,
       (SELECT m.message FROM messages m
          WHERE (m.sender_id = ? AND m.receiver_id = users.id)
             OR (m.sender_id = users.id AND m.receiver_id = ?)
          ORDER BY m.created_at DESC LIMIT 1) AS last_message,
       (SELECT m.created_at FROM messages m
          WHERE (m.sender_id = ? AND m.receiver_id = users.id)
             OR (m.sender_id = users.id AND m.receiver_id = ?)
          ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
       (SELECT COUNT(*) FROM messages m
          WHERE m.sender_id = users.id AND m.receiver_id = ? AND m.is_read = 0) AS unread_count
     FROM users
     ${PROFILE_JOINS}
     WHERE users.id IN (
       SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?
     )
     ORDER BY last_message_at DESC`,
    [callerId, callerId, callerId, callerId, callerId, callerId, callerId, callerId],
  );

  return sendOk(res, rows.map((row) => ({ ...row, unread_count: Number(row.unread_count) })));
};


const getThreadWithUser = async (req, res) => {
  const callerId = req.user.userId;
  const otherUserId = Number(req.params.userId);

  if (!Number.isInteger(otherUserId) || otherUserId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'A valid userId is required.');
  }

  
  
  await pool.execute(
    `UPDATE messages SET is_read = 1
     WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
    [otherUserId, callerId],
  );

  const [rows] = await pool.execute(
    `SELECT id, sender_id, receiver_id, message, subject, is_read, edited_at, created_at
     FROM messages
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [callerId, otherUserId, otherUserId, callerId],
  );

  return sendOk(res, rows);
};

const createMessage = async (req, res) => {
  const validationErrors = validateCreateMessage(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const senderId = req.user.userId;
  const receiverId = Number(req.body.receiver_id);
  const message = req.body.message.trim();
  const subject = req.body.subject ? req.body.subject.trim() : null;

  if (receiverId === senderId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'You cannot message yourself.');
  }

  const [receiverRows] = await pool.execute('SELECT id, status FROM users WHERE id = ?', [
    receiverId,
  ]);

  if (receiverRows.length === 0 || receiverRows[0].status !== 'active') {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Recipient not found or not active.');
  }

  const [result] = await pool.execute(
    `INSERT INTO messages (sender_id, receiver_id, subject, message, is_read)
     VALUES (?, ?, ?, ?, 0)`,
    [senderId, receiverId, subject, message],
  );

  const [rows] = await pool.execute(
    'SELECT id, sender_id, receiver_id, message, subject, is_read, edited_at, created_at FROM messages WHERE id = ?',
    [result.insertId],
  );

  const [senderRows] = await pool.execute(
    `SELECT ${NAME_EXPR} AS name FROM users ${PROFILE_JOINS} WHERE users.id = ?`,
    [senderId],
  );

  
  
  await notifyUser({
    userId: receiverId,
    title: `New message from ${senderRows[0] ? senderRows[0].name : 'a user'}`,
    message: subject || message,
    type: 'message',
  });

  logger.info(`Message ${result.insertId} sent by user ${senderId} to user ${receiverId}`);

  return sendCreated(res, rows[0]);
};


const findOwnMessage = async (messageId, callerId) => {
  const [rows] = await pool.execute(
    'SELECT id, sender_id, receiver_id FROM messages WHERE id = ?',
    [messageId],
  );

  if (rows.length === 0) {
    return { message: null, owned: false };
  }

  return { message: rows[0], owned: rows[0].sender_id === callerId };
};

const parseMessageId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const updateMessage = async (req, res) => {
  const callerId = req.user.userId;
  const messageId = parseMessageId(req.params.id);

  if (!messageId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid message id.');
  }

  const validationErrors = validateUpdateMessage(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const { message, owned } = await findOwnMessage(messageId, callerId);

  if (!message) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Message not found.');
  }

  if (!owned) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'You can only edit your own messages.');
  }

  
  
  await pool.execute('UPDATE messages SET message = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?', [
    req.body.message.trim(),
    messageId,
  ]);

  const [rows] = await pool.execute(
    'SELECT id, sender_id, receiver_id, message, subject, is_read, edited_at, created_at FROM messages WHERE id = ?',
    [messageId],
  );

  logger.info(`Message ${messageId} edited by user ${callerId}`);

  return sendOk(res, rows[0]);
};

const deleteMessage = async (req, res) => {
  const callerId = req.user.userId;
  const messageId = parseMessageId(req.params.id);

  if (!messageId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid message id.');
  }

  const { message, owned } = await findOwnMessage(messageId, callerId);

  if (!message) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Message not found.');
  }

  if (!owned) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'You can only delete your own messages.');
  }

  
  await pool.execute('DELETE FROM messages WHERE id = ?', [messageId]);

  logger.info(`Message ${messageId} deleted by user ${callerId}`);

  return sendOk(res, { id: messageId, deleted: true });
};


const getUnreadCount = async (req, res) => {
  const [[{ unread_count: unreadCount }]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM messages WHERE receiver_id = ? AND is_read = 0',
    [req.user.userId],
  );

  return sendOk(res, { unread_count: Number(unreadCount) });
};


const listRecipients = async (req, res) => {
  const callerId = req.user.userId;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const havingClause = search ? 'HAVING (name LIKE ? OR users.email LIKE ?)' : '';
  const havingParams = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.execute(
    `SELECT
       users.id AS user_id,
       ${NAME_EXPR} AS name,
       roles.name AS role,
       users.email
     FROM users
     ${PROFILE_JOINS}
     WHERE users.id != ? AND users.status = 'active'
     ${havingClause}
     ORDER BY name`,
    [callerId, ...havingParams],
  );

  return sendOk(res, rows);
};

module.exports = {
  listConversations,
  getThreadWithUser,
  createMessage,
  updateMessage,
  deleteMessage,
  listRecipients,
  getUnreadCount,
};
