const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');






const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const listNotifications = async (req, res) => {
  const userId = req.user.userId;

  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requested) && requested > 0
    ? Math.min(requested, MAX_LIMIT)
    : DEFAULT_LIMIT;

  
  
  const [rows] = await pool.execute(
    `SELECT id, title, message, type, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${limit}`,
    [userId],
  );

  const [[{ unread_count: unreadCount }]] = await pool.execute(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
  );

  return sendOk(res, {
    notifications: rows.map((row) => ({ ...row, is_read: Boolean(row.is_read) })),
    unread_count: Number(unreadCount),
  });
};

const markRead = async (req, res) => {
  const userId = req.user.userId;
  const notificationId = Number(req.params.id);

  if (!Number.isInteger(notificationId) || notificationId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid notification id.');
  }

  
  
  const [result] = await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Notification not found.');
  }

  return sendOk(res, { id: notificationId, is_read: true });
};

const markAllRead = async (req, res) => {
  const userId = req.user.userId;

  const [result] = await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId],
  );

  return sendOk(res, { updated: result.affectedRows });
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
};
