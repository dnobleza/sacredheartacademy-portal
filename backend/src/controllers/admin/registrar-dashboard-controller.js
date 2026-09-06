const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');


const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;

const PENDING_ADMISSION_STATUSES = ['pending', 'reviewing'];

const EMPTY_COUNTS = {
  students: 0,
  enrolled_this_year: 0,
  pending_admissions: 0,
  sections: 0,
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

const getStudentCount = async () => {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM students');

  return rows[0].total;
};

const getSectionCount = async () => {
  const [rows] = await pool.execute('SELECT COUNT(*) AS total FROM sections');

  return rows[0].total;
};

const getPendingAdmissionCount = async () => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM admission_applications
     WHERE status IN (?, ?)`,
    PENDING_ADMISSION_STATUSES,
  );

  return rows[0].total;
};

const getEnrolledCount = async (academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM enrollments
     WHERE academic_year_id = ? AND status = 'active'`,
    [academicYearId],
  );

  return rows[0].total;
};

const getEnrolleesByGradeLevel = async (academicYearId) => {
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

const getSectionsSummary = async (academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       sections.id,
       sections.name AS section_name,
       sections.room,
       grade_levels.name AS grade_level_name,
       grade_levels.level_number,
       COUNT(enrollments.id) AS student_count
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     LEFT JOIN enrollments
            ON enrollments.section_id = sections.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active'
     GROUP BY sections.id, sections.name, sections.room, grade_levels.name, grade_levels.level_number
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name`,
    [academicYearId],
  );

  return rows;
};

const getUnassignedStudents = async (academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       students.id,
       students.first_name,
       students.last_name,
       users.email
     FROM students
     LEFT JOIN users ON users.id = students.user_id
     LEFT JOIN enrollments
            ON enrollments.student_id = students.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active'
     WHERE enrollments.id IS NULL
     ORDER BY students.last_name, students.first_name
     LIMIT 10`,
    [academicYearId],
  );

  return rows;
};

const getRecentAdmissions = async () => {
  const [rows] = await pool.execute(
    `SELECT
       admission_applications.id,
       admission_applications.reference_number,
       admission_applications.first_name,
       admission_applications.last_name,
       admission_applications.status,
       admission_applications.created_at,
       grade_levels.name AS grade_level_name
     FROM admission_applications
     LEFT JOIN grade_levels ON grade_levels.id = admission_applications.grade_level_id
     ORDER BY admission_applications.created_at DESC, admission_applications.id DESC
     LIMIT 5`,
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
     WHERE announcements.target_role IN ('all', 'admins')
     ORDER BY announcements.created_at DESC, announcements.id DESC
     LIMIT 5`,
  );

  return rows;
};

const getDashboard = async (req, res) => {
  const activeAcademicYear = await getActiveAcademicYear();

  const [students, sections, pendingAdmissions, recentAdmissions, recentAnnouncements] =
    await Promise.all([
      getStudentCount(),
      getSectionCount(),
      getPendingAdmissionCount(),
      getRecentAdmissions(),
      getRecentAnnouncements(),
    ]);

  if (!activeAcademicYear) {
    return sendOk(res, {
      counts: { ...EMPTY_COUNTS, students, sections, pending_admissions: pendingAdmissions },
      active_academic_year: null,
      enrollees_by_grade_level: [],
      sections_summary: [],
      unassigned_students: [],
      recent_admissions: recentAdmissions,
      recent_announcements: recentAnnouncements,
    });
  }

  const yearId = activeAcademicYear.id;

  const [enrolledThisYear, enrolleesByGradeLevel, sectionsSummary, unassignedStudents] =
    await Promise.all([
      getEnrolledCount(yearId),
      getEnrolleesByGradeLevel(yearId),
      getSectionsSummary(yearId),
      getUnassignedStudents(yearId),
    ]);

  return sendOk(res, {
    counts: {
      students,
      enrolled_this_year: enrolledThisYear,
      pending_admissions: pendingAdmissions,
      sections,
    },
    active_academic_year: activeAcademicYear,
    enrollees_by_grade_level: enrolleesByGradeLevel,
    sections_summary: sectionsSummary,
    unassigned_students: unassignedStudents,
    recent_admissions: recentAdmissions,
    recent_announcements: recentAnnouncements,
  });
};

module.exports = {
  getDashboard,
};
