const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { validateCreateMessage } = require('../../validations/message-validation');

// SECURITY: this lives in shared/ (not admin/) because every role messages
// through the same table once their portals exist — there is no per-role
// variant. The one property that must never break: a caller can only ever
// read a thread they are a participant in. Every query below is constrained
// with req.user.userId on BOTH sides of the OR, and :userId from the URL is
// treated strictly as "the other participant", never as "whose inbox to
// show". There is no endpoint that accepts an arbitrary pair of user ids.

// A user's display name lives on exactly one of these four profile tables
// depending on role; COALESCE picks whichever is populated and falls back to
// the email for accounts with no profile row yet.
// Each CONCAT_WS is wrapped in NULLIF because CONCAT_WS never returns NULL:
// on a LEFT JOIN miss it yields '', which COALESCE treats as a hit. Without
// this the admins branch always wins and every teacher, student and parent
// comes back with an empty name.
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

/**
 * One row per person the caller has ever exchanged a message with, most
 * recent activity first. The last message, its timestamp, and the unread
 * count are pulled with correlated subqueries so the whole thing stays a
 * single round trip instead of one query per conversation.
 */
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

/**
 * The full thread between the caller and :userId, oldest first. :userId is
 * always the OTHER participant — the WHERE clause below pins the caller's id
 * on both branches of the OR, so this can never surface someone else's
 * conversation regardless of what :userId is.
 */
const getThreadWithUser = async (req, res) => {
  const callerId = req.user.userId;
  const otherUserId = Number(req.params.userId);

  if (!Number.isInteger(otherUserId) || otherUserId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'A valid userId is required.');
  }

  // Only messages the other user sent TO the caller are marked read — never
  // the caller's own outgoing messages, never a thread involving anyone else.
  await pool.execute(
    `UPDATE messages SET is_read = 1
     WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
    [otherUserId, callerId],
  );

  const [rows] = await pool.execute(
    `SELECT id, sender_id, receiver_id, message, subject, is_read, created_at
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
    'SELECT id, sender_id, receiver_id, message, subject, is_read, created_at FROM messages WHERE id = ?',
    [result.insertId],
  );

  logger.info(`Message ${result.insertId} sent by user ${senderId} to user ${receiverId}`);

  return sendCreated(res, rows[0]);
};

/**
 * Active users the caller can start a new conversation with. Uses HAVING
 * (rather than WHERE) to filter on the computed `name` alias — MySQL does not
 * allow SELECT aliases in WHERE, and there is no aggregation here to avoid.
 */
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
  listRecipients,
};
