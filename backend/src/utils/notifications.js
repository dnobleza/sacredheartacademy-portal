const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Notification writing helpers, shared by whichever feature raises them
 * (messages, announcements). Kept out of the controllers so a new source only
 * has to call one function.
 *
 * Raising a notification must never fail the action that caused it: a message
 * that was stored is sent, even if the bell entry could not be written. Errors
 * are logged and swallowed for that reason.
 */

const MAX_TITLE_LENGTH = 200;

const truncate = (value, max) => {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const notifyUser = async ({ userId, title, message, type }) => {
  try {
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [userId, truncate(title, MAX_TITLE_LENGTH), String(message || '').trim(), type || null],
    );
  } catch (error) {
    logger.error(`Could not create notification for user ${userId}: ${error.message}`);
  }
};

/**
 * One notification per user holding a role in `roles`. 'all' means everyone.
 * `excludeUserId` keeps the author from being notified about their own post.
 */
const notifyRoles = async ({ roles, title, message, type, excludeUserId }) => {
  try {
    const wantsEveryone = !roles || roles.includes('all');
    const roleList = wantsEveryone ? [] : roles;
    const placeholders = roleList.map(() => '?').join(', ');

    const roleClause = wantsEveryone ? '' : `AND roles.name IN (${placeholders})`;
    const excludeClause = excludeUserId ? 'AND users.id != ?' : '';

    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT users.id, ?, ?, ?
       FROM users
       JOIN roles ON roles.id = users.role_id
       WHERE users.status = 'active'
       ${roleClause}
       ${excludeClause}`,
      [
        truncate(title, MAX_TITLE_LENGTH),
        String(message || '').trim(),
        type || null,
        ...roleList,
        ...(excludeUserId ? [excludeUserId] : []),
      ],
    );
  } catch (error) {
    logger.error(`Could not create role notifications: ${error.message}`);
  }
};

module.exports = {
  notifyUser,
  notifyRoles,
};
