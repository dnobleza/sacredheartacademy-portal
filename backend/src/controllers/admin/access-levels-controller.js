const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');

const ADMIN_ROLE_ID = 1;

/**
 * Feeds the access level picker on the Admins form. Scoped to the admin role
 * because that is the only role the admin portal creates accounts for, and
 * because users carries a composite foreign key that would reject a level
 * belonging to any other role.
 */
const listAdminAccessLevels = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, code, level, name, description
     FROM access_levels
     WHERE role_id = ?
     ORDER BY level, name`,
    [ADMIN_ROLE_ID],
  );

  return sendOk(res, { access_levels: rows });
};

module.exports = {
  listAdminAccessLevels,
};
