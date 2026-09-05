const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');

const ADMIN_ROLE_ID = 1;


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
