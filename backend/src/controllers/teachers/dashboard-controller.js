const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');




const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;

const GRADING_PERIODS = ['1st', '2nd', '3rd', '4th'];

const toDate = (value) => {
  if (value instanceof Date) {
    return value;
  }

  
  
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));

  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
};


const currentGradingPeriod = (academicYear) => {
  if (!academicYear || !academicYear.start_date || !academicYear.end_date) {
    return GRADING_PERIODS[0];
  }

  const start = toDate(academicYear.start_date).getTime();
  const end = toDate(academicYear.end_date).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return GRADING_PERIODS[0];
  }

  const span = (end - start) / GRADING_PERIODS.length;
  const index = Math.floor((now - start) / span);

  return GRADING_PERIODS[Math.min(Math.max(index, 0), GRADING_PERIODS.length - 1)];
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


const getAdvisoryClasses = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       advisory_classes.id,
       advisory_classes.section_id,
       sections.name AS section_name,
       sections.room,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = advisory_classes.section_id
           AND enrollments.academic_year_id = advisory_classes.academic_year_id
           AND enrollments.status = 'active') AS student_count
     FROM advisory_classes
     JOIN sections ON sections.id = advisory_classes.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE advisory_classes.teacher_id = ? AND advisory_classes.academic_year_id = ?
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name`,
    [teacherId, academicYearId],
  );

  return rows;
};




const getClassCount = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM (
       SELECT class_subjects.section_id
       FROM class_subjects
       WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?
       UNION
       SELECT advisory_classes.section_id
       FROM advisory_classes
       WHERE advisory_classes.teacher_id = ? AND advisory_classes.academic_year_id = ?
     ) AS teacher_sections`,
    [teacherId, academicYearId, teacherId, academicYearId],
  );

  return rows[0].total;
};



const getStudentCount = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(DISTINCT enrollments.student_id) AS total
     FROM enrollments
     WHERE enrollments.academic_year_id = ?
       AND enrollments.status = 'active'
       AND enrollments.section_id IN (
         SELECT class_subjects.section_id
         FROM class_subjects
         WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?
         UNION
         SELECT advisory_classes.section_id
         FROM advisory_classes
         WHERE advisory_classes.teacher_id = ? AND advisory_classes.academic_year_id = ?
       )`,
    [academicYearId, teacherId, academicYearId, teacherId, academicYearId],
  );

  return rows[0].total;
};

const getAttendanceRate = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(attendance.status IN ('present', 'late')) AS present_total
     FROM attendance
     JOIN class_subjects ON class_subjects.id = attendance.class_subject_id
     WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?`,
    [teacherId, academicYearId],
  );

  const { total, present_total: presentTotal } = rows[0];

  
  if (!total) {
    return null;
  }

  return Math.round((Number(presentTotal) / Number(total)) * 100);
};

const getPendingGradeCount = async (teacherId, academicYearId, gradingPeriod) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM class_subjects
     JOIN enrollments
       ON enrollments.section_id = class_subjects.section_id
      AND enrollments.academic_year_id = class_subjects.academic_year_id
      AND enrollments.status = 'active'
     LEFT JOIN grades
       ON grades.class_subject_id = class_subjects.id
      AND grades.student_id = enrollments.student_id
      AND grades.grading_period = ?
     WHERE class_subjects.teacher_id = ?
       AND class_subjects.academic_year_id = ?
       AND grades.id IS NULL`,
    [gradingPeriod, teacherId, academicYearId],
  );

  return rows[0].total;
};


const getAttendanceToday = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id AS class_subject_id,
       subjects.name AS subject_name,
       sections.name AS section_name,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = class_subjects.section_id
           AND enrollments.academic_year_id = class_subjects.academic_year_id
           AND enrollments.status = 'active') AS roster_count,
       COUNT(attendance.id) AS marked_count,
       COALESCE(SUM(attendance.status IN ('present', 'late')), 0) AS present_count
     FROM class_subjects
     JOIN sections ON sections.id = class_subjects.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN attendance
       ON attendance.class_subject_id = class_subjects.id
      AND attendance.attendance_date = CURDATE()
     WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?
     GROUP BY class_subjects.id, subjects.name, sections.name, grade_levels.name,
              class_subjects.section_id, class_subjects.academic_year_id
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name, subjects.name`,
    [teacherId, academicYearId],
  );

  return rows.map((row) => ({
    ...row,
    
    taken: Number(row.marked_count) > 0,
  }));
};


const getMissingGradesByClass = async (teacherId, academicYearId, gradingPeriod) => {
  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id AS class_subject_id,
       subjects.name AS subject_name,
       sections.name AS section_name,
       grade_levels.name AS grade_level_name,
       SUM(grades.id IS NULL) AS missing_count
     FROM class_subjects
     JOIN sections ON sections.id = class_subjects.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     JOIN enrollments
       ON enrollments.section_id = class_subjects.section_id
      AND enrollments.academic_year_id = class_subjects.academic_year_id
      AND enrollments.status = 'active'
     LEFT JOIN grades
       ON grades.class_subject_id = class_subjects.id
      AND grades.student_id = enrollments.student_id
      AND grades.grading_period = ?
     WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?
     GROUP BY class_subjects.id, subjects.name, sections.name, grade_levels.name
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name, subjects.name`,
    [gradingPeriod, teacherId, academicYearId],
  );

  return rows;
};

const MAX_PENDING_TASKS = 6;


const buildPendingTasks = (missingGrades, attendanceToday, gradingPeriod) => {
  const gradeTasks = missingGrades.map((row) => ({
    type: 'grades',
    class_subject_id: row.class_subject_id,
    label: `${row.grade_level_name} ${row.section_name} · ${row.subject_name}`,
    detail: Number(row.missing_count) > 0
      ? `${row.missing_count} student grade(s) missing for the ${gradingPeriod} grading period`
      : `${gradingPeriod} grading period submitted`,
    done: Number(row.missing_count) === 0,
  }));

  const attendanceTasks = attendanceToday.map((row) => ({
    type: 'attendance',
    class_subject_id: row.class_subject_id,
    label: `${row.grade_level_name} ${row.section_name} · ${row.subject_name}`,
    detail: row.taken ? "Today's attendance recorded" : "Today's attendance not taken",
    done: row.taken,
  }));

  const tasks = [...gradeTasks, ...attendanceTasks];

  return [...tasks.filter((task) => !task.done), ...tasks.filter((task) => task.done)]
    .slice(0, MAX_PENDING_TASKS);
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
     WHERE announcements.target_role IN ('all', 'teachers')
     ORDER BY announcements.created_at DESC, announcements.id DESC
     LIMIT 5`,
  );

  return rows;
};

const EMPTY_COUNTS = {
  classes: 0,
  students: 0,
  attendance_rate: null,
  pending_grades: 0,
};

const getDashboard = async (req, res) => {
  
  
  
  
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const activeAcademicYear = await getActiveAcademicYear();
  const gradingPeriod = currentGradingPeriod(activeAcademicYear);
  const recentAnnouncements = await getRecentAnnouncements();

  
  
  
  if (!activeAcademicYear) {
    return sendOk(res, {
      counts: EMPTY_COUNTS,
      active_academic_year: null,
      current_grading_period: gradingPeriod,
      advisory_classes: [],
      attendance_today: [],
      pending_tasks: [],
      recent_announcements: recentAnnouncements,
    });
  }

  const yearId = activeAcademicYear.id;

  const [classes, students, attendanceRate, pendingGrades, advisoryClasses, attendanceToday, missingGrades] =
    await Promise.all([
      getClassCount(teacherId, yearId),
      getStudentCount(teacherId, yearId),
      getAttendanceRate(teacherId, yearId),
      getPendingGradeCount(teacherId, yearId, gradingPeriod),
      getAdvisoryClasses(teacherId, yearId),
      getAttendanceToday(teacherId, yearId),
      getMissingGradesByClass(teacherId, yearId, gradingPeriod),
    ]);

  return sendOk(res, {
    counts: {
      classes,
      students,
      attendance_rate: attendanceRate,
      pending_grades: pendingGrades,
    },
    active_academic_year: activeAcademicYear,
    current_grading_period: gradingPeriod,
    advisory_classes: advisoryClasses,
    attendance_today: attendanceToday,
    pending_tasks: buildPendingTasks(missingGrades, attendanceToday, gradingPeriod),
    recent_announcements: recentAnnouncements,
  });
};

module.exports = {
  getDashboard,
};
