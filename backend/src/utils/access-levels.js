const pool = require('../config/database');


const ACCESS_LEVELS = Object.freeze({
  STUDENT: 0,
  PARENT: 0,
  TEACHER: 1,
  LABORATORY_STAFF: 2,
  LIBRARIAN: 3,
  REGISTRAR: 3,
  SUPER_ADMIN: 4,
});


const findSoleAccessLevelId = async (roleId) => {
  const [rows] = await pool.execute('SELECT id FROM access_levels WHERE role_id = ?', [roleId]);

  if (rows.length !== 1) {
    throw new Error(
      `Expected exactly one access level for role ${roleId}, found ${rows.length}.`,
    );
  }

  return rows[0].id;
};

module.exports = {
  ACCESS_LEVELS,
  findSoleAccessLevelId,
};
