const pool = require('../config/database');

/**
 * The tiers seeded by database/migrations/009_add_access_levels.sql. Kept here
 * so route guards read as a name rather than a bare number. Librarian and
 * Registrar share tier 3: a numeric guard cannot tell those two apart, only
 * how much access they carry.
 */
const ACCESS_LEVELS = Object.freeze({
  STUDENT: 0,
  PARENT: 0,
  TEACHER: 1,
  LABORATORY_STAFF: 2,
  LIBRARIAN: 3,
  REGISTRAR: 3,
  SUPER_ADMIN: 4,
});

/**
 * The access level for a role that is meant to have exactly one — every role
 * except admin. Throws rather than returning null so a role that later gains a
 * second level fails with a message naming it, instead of writing NULL into a
 * NOT NULL column and surfacing as a foreign key error.
 */
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
