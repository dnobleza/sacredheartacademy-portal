const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');
const { currentGradingPeriod } = require('../../utils/grading-period');
const { getActiveAcademicYear } = require('../../utils/billing');




const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;

const TEACHER_NAME_EXPR = "NULLIF(CONCAT_WS(' ', teachers.first_name, teachers.last_name), '')";

const MAX_UPCOMING_ASSIGNMENTS = 5;




const getEnrollment = async (studentId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       enrollments.section_id,
       sections.name AS section_name,
       sections.room AS section_room,
       grade_levels.id AS grade_level_id,
       grade_levels.name AS grade_level_name
     FROM enrollments
     JOIN sections ON sections.id = enrollments.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE enrollments.student_id = ?
       AND enrollments.academic_year_id = ?
       AND enrollments.status = 'active'
     LIMIT 1`,
    [studentId, academicYearId],
  );

  return rows.length > 0 ? rows[0] : null;
};




const getStudentProfile = async (studentId) => {
  const [rows] = await pool.execute(
    `SELECT
       students.id,
       students.student_number,
       students.first_name,
       students.middle_name,
       students.last_name,
       students.photo_id,
       users.email
     FROM students
     JOIN users ON users.id = students.user_id
     WHERE students.id = ?`,
    [studentId],
  );

  return rows.length > 0 ? rows[0] : null;
};




const getAdviser = async (sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       teachers.id,
       ${TEACHER_NAME_EXPR} AS name,
       teachers.photo_id
     FROM advisory_classes
     JOIN teachers ON teachers.id = advisory_classes.teacher_id
     WHERE advisory_classes.section_id = ? AND advisory_classes.academic_year_id = ?
     LIMIT 1`,
    [sectionId, academicYearId],
  );

  return rows.length > 0 ? rows[0] : null;
};




const getSubjectCount = async (sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM class_subjects
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?`,
    [sectionId, academicYearId],
  );

  return Number(rows[0].total);
};




const getAverage = async (studentId, sectionId, academicYearId, gradingPeriod) => {
  const [rows] = await pool.execute(
    `SELECT AVG(grades.grade) AS average
     FROM grades
     JOIN class_subjects ON class_subjects.id = grades.class_subject_id
     WHERE grades.student_id = ?
       AND grades.grading_period = ?
       AND class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?`,
    [studentId, gradingPeriod, sectionId, academicYearId],
  );

  const { average } = rows[0];

  return average === null ? null : Math.round(Number(average) * 100) / 100;
};




const getAttendanceRate = async (studentId, sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       SUM(attendance.status IN ('present', 'late')) AS present_total
     FROM attendance
     JOIN class_subjects ON class_subjects.id = attendance.class_subject_id
     WHERE attendance.student_id = ?
       AND class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?`,
    [studentId, sectionId, academicYearId],
  );

  const { total, present_total: presentTotal } = rows[0];

  if (!Number(total)) {
    return null;
  }

  return Math.round((Number(presentTotal) / Number(total)) * 100);
};




const getTodaySchedule = async (sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       schedules.id,
       schedules.day_of_week,
       schedules.start_time,
       schedules.end_time,
       COALESCE(schedules.room, sections.room) AS room,
       subjects.name AS subject_name,
       subjects.code AS subject_code,
       ${TEACHER_NAME_EXPR} AS teacher_name
     FROM schedules
     JOIN class_subjects ON class_subjects.id = schedules.class_subject_id
     JOIN sections ON sections.id = class_subjects.section_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN teachers ON teachers.id = class_subjects.teacher_id
     WHERE class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?
       AND schedules.day_of_week = DAYNAME(CURDATE())
     ORDER BY schedules.start_time`,
    [sectionId, academicYearId],
  );

  return rows;
};




const getGrades = async (studentId, sectionId, academicYearId, gradingPeriod) => {
  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id AS class_subject_id,
       subjects.name AS subject_name,
       subjects.code AS subject_code,
       ${TEACHER_NAME_EXPR} AS teacher_name,
       grades.grade,
       grades.remarks
     FROM class_subjects
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN teachers ON teachers.id = class_subjects.teacher_id
     LEFT JOIN grades
       ON grades.class_subject_id = class_subjects.id
      AND grades.student_id = ?
      AND grades.grading_period = ?
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY subjects.name`,
    [studentId, gradingPeriod, sectionId, academicYearId],
  );

  return rows.map((row) => ({
    ...row,
    grade: row.grade === null ? null : Number(row.grade),
  }));
};




const getUpcomingAssignments = async (studentId, sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       assignments.id,
       assignments.title,
       assignments.due_date,
       subjects.name AS subject_name,
       ${TEACHER_NAME_EXPR} AS teacher_name
     FROM assignments
     JOIN class_subjects ON class_subjects.id = assignments.class_subject_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN teachers ON teachers.id = class_subjects.teacher_id
     LEFT JOIN submissions
       ON submissions.assignment_id = assignments.id
      AND submissions.student_id = ?
     WHERE class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?
       AND submissions.id IS NULL
       AND (assignments.due_date IS NULL OR assignments.due_date >= NOW())
     ORDER BY assignments.due_date IS NULL, assignments.due_date
     LIMIT ${MAX_UPCOMING_ASSIGNMENTS}`,
    [studentId, sectionId, academicYearId],
  );

  return rows;
};




const countPendingAssignments = async (studentId, sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM assignments
     JOIN class_subjects ON class_subjects.id = assignments.class_subject_id
     LEFT JOIN submissions
       ON submissions.assignment_id = assignments.id
      AND submissions.student_id = ?
     WHERE class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?
       AND submissions.id IS NULL`,
    [studentId, sectionId, academicYearId],
  );

  return Number(rows[0].total);
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
     WHERE announcements.target_role IN ('all', 'students')
     ORDER BY announcements.created_at DESC, announcements.id DESC
     LIMIT 5`,
  );

  return rows;
};




const EMPTY_STATS = {
  average: null,
  attendance_rate: null,
  subjects: 0,
  pending_assignments: 0,
};

const getDashboard = async (req, res) => {
  const studentId = req.user.profileId;

  if (!studentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No student profile is linked to this account.');
  }

  const [profile, activeAcademicYear] = await Promise.all([
    getStudentProfile(studentId),
    getActiveAcademicYear(),
  ]);

  if (!profile) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student profile not found.');
  }

  const gradingPeriod = currentGradingPeriod(activeAcademicYear);
  const announcements = await getRecentAnnouncements();

  const enrollment = activeAcademicYear
    ? await getEnrollment(studentId, activeAcademicYear.id)
    : null;

  // Without an active year, or before the registrar places the student in a
  // section, there is nothing academic to read — the header and announcements
  // still render, and the UI hides the lines it has no value for.
  if (!enrollment) {
    return sendOk(res, {
      student: { ...profile, section_name: null, grade_level_name: null, adviser: null },
      active_academic_year: activeAcademicYear,
      current_grading_period: gradingPeriod,
      stats: EMPTY_STATS,
      today_schedule: [],
      grades: [],
      upcoming_assignments: [],
      announcements,
    });
  }

  const yearId = activeAcademicYear.id;
  const { section_id: sectionId } = enrollment;

  const [
    adviser,
    subjects,
    average,
    attendanceRate,
    pendingAssignments,
    todaySchedule,
    grades,
    upcomingAssignments,
  ] = await Promise.all([
    getAdviser(sectionId, yearId),
    getSubjectCount(sectionId, yearId),
    getAverage(studentId, sectionId, yearId, gradingPeriod),
    getAttendanceRate(studentId, sectionId, yearId),
    countPendingAssignments(studentId, sectionId, yearId),
    getTodaySchedule(sectionId, yearId),
    getGrades(studentId, sectionId, yearId, gradingPeriod),
    getUpcomingAssignments(studentId, sectionId, yearId),
  ]);

  return sendOk(res, {
    student: {
      ...profile,
      section_id: sectionId,
      section_name: enrollment.section_name,
      grade_level_id: enrollment.grade_level_id,
      grade_level_name: enrollment.grade_level_name,
      adviser,
    },
    active_academic_year: activeAcademicYear,
    current_grading_period: gradingPeriod,
    stats: {
      average,
      attendance_rate: attendanceRate,
      subjects,
      pending_assignments: pendingAssignments,
    },
    today_schedule: todaySchedule,
    grades,
    upcoming_assignments: upcomingAssignments,
    announcements,
  });
};

module.exports = {
  getDashboard,
  getEnrollment,
  getStudentProfile,
  getAdviser,
  getAttendanceRate,
};
