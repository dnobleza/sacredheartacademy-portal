const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');

// Mirrors the author_name expression used by the announcements list endpoint.
// CONCAT_WS never returns NULL, so an admin-less author (LEFT JOIN miss)
// produces '' rather than NULL and COALESCE alone would not fall through to
// the email; NULLIF turns that '' back into NULL first.
const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;

const COUNT_QUERIES = {
  students: 'SELECT COUNT(*) AS total FROM students',
  teachers: 'SELECT COUNT(*) AS total FROM teachers',
  parents: 'SELECT COUNT(*) AS total FROM parents',
  admins: 'SELECT COUNT(*) AS total FROM admins',
  sections: 'SELECT COUNT(*) AS total FROM sections',
  subjects: 'SELECT COUNT(*) AS total FROM subjects',
  grade_levels: 'SELECT COUNT(*) AS total FROM grade_levels',
  academic_years: 'SELECT COUNT(*) AS total FROM academic_years',
  classes: 'SELECT COUNT(*) AS total FROM advisory_classes',
  schedules: 'SELECT COUNT(*) AS total FROM schedules',
  announcements: 'SELECT COUNT(*) AS total FROM announcements',
};

// This endpoint exists specifically to replace the frontend firing one
// request per resource, so the counts are run in parallel rather than as one
// giant UNION or sequential round trips.
const getCounts = async () => {
  const keys = Object.keys(COUNT_QUERIES);

  const results = await Promise.all(
    keys.map((key) => pool.execute(COUNT_QUERIES[key]).then(([rows]) => rows[0].total)),
  );

  return keys.reduce((counts, key, index) => {
    counts[key] = results[index];
    return counts;
  }, {});
};

const getActiveAcademicYear = async () => {
  const [rows] = await pool.execute(
    `SELECT id, name, start_date, end_date
     FROM academic_years
     WHERE status = 'active'
     LIMIT 1`,
  );

  // No active academic year is a legitimate state (e.g. between school
  // years), not an error — the frontend is expected to warn about it.
  return rows.length > 0 ? rows[0] : null;
};

const getRecentAnnouncements = async () => {
  const [rows] = await pool.execute(
    `SELECT
       announcements.id,
       announcements.title,
       announcements.target_role,
       ${AUTHOR_NAME_EXPR} AS author_name,
       announcements.created_at
     FROM announcements
     LEFT JOIN users ON users.id = announcements.created_by
     LEFT JOIN admins ON admins.user_id = users.id
     ORDER BY announcements.created_at DESC, announcements.id DESC
     LIMIT 5`,
  );

  return rows;
};

const getDashboard = async (req, res) => {
  const [counts, activeAcademicYear, recentAnnouncements] = await Promise.all([
    getCounts(),
    getActiveAcademicYear(),
    getRecentAnnouncements(),
  ]);

  return sendOk(res, {
    counts,
    active_academic_year: activeAcademicYear,
    recent_announcements: recentAnnouncements,
  });
};

module.exports = {
  getDashboard,
};
