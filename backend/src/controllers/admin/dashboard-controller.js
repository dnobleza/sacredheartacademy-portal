const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');





const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;



const COUNT_QUERIES = {
  students: 'SELECT COUNT(*) AS total FROM students',
  teachers: 'SELECT COUNT(*) AS total FROM teachers',
  parents: 'SELECT COUNT(*) AS total FROM parents',
  admins: 'SELECT COUNT(*) AS total FROM admins',
};




const recentPeopleQuery = (table) => `
  SELECT
    ${table}.id,
    ${table}.first_name,
    ${table}.last_name,
    ${table}.created_at,
    users.email
  FROM ${table}
  LEFT JOIN users ON users.id = ${table}.user_id
  ORDER BY ${table}.created_at DESC, ${table}.id DESC
  LIMIT 5`;


const RECENT_PEOPLE_QUERIES = {
  recent_students: recentPeopleQuery('students'),
  recent_teachers: recentPeopleQuery('teachers'),
  recent_parents: recentPeopleQuery('parents'),
  recent_admins: recentPeopleQuery('admins'),
};




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

const getRecentPeople = async () => {
  const keys = Object.keys(RECENT_PEOPLE_QUERIES);

  const results = await Promise.all(
    keys.map((key) => pool.execute(RECENT_PEOPLE_QUERIES[key]).then(([rows]) => rows)),
  );

  return keys.reduce((people, key, index) => {
    people[key] = results[index];
    return people;
  }, {});
};

const getActiveAcademicYear = async () => {
  const [rows] = await pool.execute(
    `SELECT id, name, start_date, end_date
     FROM academic_years
     WHERE status = 'active'
     LIMIT 1`,
  );

  
  
  return rows.length > 0 ? rows[0] : null;
};

const getEnrolleesByGradeLevel = async (academicYearId) => {
  
  
  if (!academicYearId) {
    return [];
  }

  const [rows] = await pool.execute(
    `SELECT
       grade_levels.id,
       grade_levels.name,
       grade_levels.level_number,
       COUNT(enrollments.id) AS total
     FROM grade_levels
     LEFT JOIN sections ON sections.grade_level_id = grade_levels.id
     LEFT JOIN enrollments
            ON enrollments.section_id = sections.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active'
     GROUP BY grade_levels.id, grade_levels.name, grade_levels.level_number
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, grade_levels.name`,
    [academicYearId],
  );

  return rows;
};

const getRecentAnnouncements = async () => {
  const [rows] = await pool.execute(
    `SELECT
       announcements.id,
       announcements.title,
       announcements.content,
       announcements.target_role,
       announcements.image_id,
       ${AUTHOR_NAME_EXPR} AS author_name,
       admins.photo_id AS author_photo_id,
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
  const [counts, activeAcademicYear, recentAnnouncements, recentPeople] = await Promise.all([
    getCounts(),
    getActiveAcademicYear(),
    getRecentAnnouncements(),
    getRecentPeople(),
  ]);

  
  const enrolleesByGradeLevel = await getEnrolleesByGradeLevel(activeAcademicYear?.id);

  return sendOk(res, {
    counts,
    active_academic_year: activeAcademicYear,
    recent_announcements: recentAnnouncements,
    ...recentPeople,
    enrollees_by_grade_level: enrolleesByGradeLevel,
  });
};

module.exports = {
  getDashboard,
};
