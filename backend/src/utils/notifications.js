const pool = require('../config/database');
const logger = require('../utils/logger');



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

const notifyAccessLevel = async ({ accessLevelId, title, message, type, excludeUserId }) => {
  try {
    const excludeClause = excludeUserId ? 'AND users.id != ?' : '';

    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT users.id, ?, ?, ?
       FROM users
       WHERE users.status = 'active'
         AND users.access_level_id = ?
         ${excludeClause}`,
      [
        truncate(title, MAX_TITLE_LENGTH),
        String(message || '').trim(),
        type || null,
        accessLevelId,
        ...(excludeUserId ? [excludeUserId] : []),
      ],
    );
  } catch (error) {
    logger.error(`Could not create access level notifications: ${error.message}`);
  }
};

module.exports = {
  notifyUser,
  notifyRoles,
  notifyAccessLevel,
};
