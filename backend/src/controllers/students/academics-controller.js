const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');
const { GRADING_PERIODS, currentGradingPeriod } = require('../../utils/grading-period');
const { getActiveAcademicYear } = require('../../utils/billing');
const { getEnrollment, getAdviser, getAttendanceRate } = require('./dashboard-controller');




const TEACHER_NAME_EXPR = "NULLIF(CONCAT_WS(' ', teachers.first_name, teachers.last_name), '')";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MAX_ATTENDANCE_ROWS = 60;




// Every screen here answers "what about me, this school year", so they all
// start from the same three facts: who is asking, which year is active, and
// which section that puts them in.
const resolveContext = async (req, res) => {
  const studentId = req.user.profileId;

  if (!studentId) {
    sendError(res, HTTP_STATUS.FORBIDDEN, 'No student profile is linked to this account.');
    return null;
  }

  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return { studentId, activeAcademicYear: null, enrollment: null };
  }

  const enrollment = await getEnrollment(studentId, activeAcademicYear.id);

  return { studentId, activeAcademicYear, enrollment };
};




const listClasses = async (req, res) => {
  const context = await resolveContext(req, res);

  if (!context) {
    return undefined;
  }

  const { activeAcademicYear, enrollment } = context;

  if (!enrollment) {
    return sendOk(res, { active_academic_year: activeAcademicYear, adviser: null, classes: [] });
  }

  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id AS class_subject_id,
       subjects.id AS subject_id,
       subjects.code AS subject_code,
       subjects.name AS subject_name,
       subjects.description AS subject_description,
       ${TEACHER_NAME_EXPR} AS teacher_name,
       teachers.photo_id AS teacher_photo_id
     FROM class_subjects
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN teachers ON teachers.id = class_subjects.teacher_id
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY subjects.name`,
    [enrollment.section_id, activeAcademicYear.id],
  );

  const [slots] = await pool.execute(
    `SELECT
       schedules.class_subject_id,
       schedules.day_of_week,
       schedules.start_time,
       schedules.end_time,
       COALESCE(schedules.room, sections.room) AS room
     FROM schedules
     JOIN class_subjects ON class_subjects.id = schedules.class_subject_id
     JOIN sections ON sections.id = class_subjects.section_id
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY FIELD(schedules.day_of_week, ${DAYS.map(() => '?').join(', ')}), schedules.start_time`,
    [enrollment.section_id, activeAcademicYear.id, ...DAYS],
  );

  const adviser = await getAdviser(enrollment.section_id, activeAcademicYear.id);

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    section_name: enrollment.section_name,
    grade_level_name: enrollment.grade_level_name,
    adviser,
    classes: rows.map((row) => ({
      ...row,
      schedule: slots.filter((slot) => slot.class_subject_id === row.class_subject_id),
    })),
  });
};




const getSchedule = async (req, res) => {
  const context = await resolveContext(req, res);

  if (!context) {
    return undefined;
  }

  const { activeAcademicYear, enrollment } = context;

  const empty = DAYS.map((day) => ({ day, slots: [] }));

  if (!enrollment) {
    return sendOk(res, { active_academic_year: activeAcademicYear, days: empty });
  }

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
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY schedules.start_time`,
    [enrollment.section_id, activeAcademicYear.id],
  );

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    section_name: enrollment.section_name,
    grade_level_name: enrollment.grade_level_name,
    days: DAYS.map((day) => ({
      day,
      slots: rows.filter((row) => row.day_of_week === day),
    })),
  });
};




const listGrades = async (req, res) => {
  const context = await resolveContext(req, res);

  if (!context) {
    return undefined;
  }

  const { studentId, activeAcademicYear, enrollment } = context;
  const gradingPeriod = currentGradingPeriod(activeAcademicYear);

  if (!enrollment) {
    return sendOk(res, {
      active_academic_year: activeAcademicYear,
      current_grading_period: gradingPeriod,
      grading_periods: GRADING_PERIODS,
      subjects: [],
    });
  }

  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id AS class_subject_id,
       subjects.name AS subject_name,
       subjects.code AS subject_code,
       ${TEACHER_NAME_EXPR} AS teacher_name,
       grades.grading_period,
       grades.grade,
       grades.remarks
     FROM class_subjects
     JOIN subjects ON subjects.id = class_subjects.subject_id
     LEFT JOIN teachers ON teachers.id = class_subjects.teacher_id
     LEFT JOIN grades
       ON grades.class_subject_id = class_subjects.id
      AND grades.student_id = ?
     WHERE class_subjects.section_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY subjects.name`,
    [studentId, enrollment.section_id, activeAcademicYear.id],
  );

  // One row per subject with a grade per period, which is what a report card
  // looks like — the query returns one row per subject-period pair.
  const bySubject = new Map();

  rows.forEach((row) => {
    if (!bySubject.has(row.class_subject_id)) {
      bySubject.set(row.class_subject_id, {
        class_subject_id: row.class_subject_id,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        teacher_name: row.teacher_name,
        periods: Object.fromEntries(GRADING_PERIODS.map((period) => [period, null])),
        remarks: null,
      });
    }

    if (row.grading_period) {
      const subject = bySubject.get(row.class_subject_id);

      subject.periods[row.grading_period] = Number(row.grade);

      if (row.grading_period === gradingPeriod) {
        subject.remarks = row.remarks;
      }
    }
  });

  const subjects = [...bySubject.values()].map((subject) => {
    const marks = GRADING_PERIODS.map((period) => subject.periods[period]).filter(
      (grade) => grade !== null,
    );

    return {
      ...subject,
      average:
        marks.length > 0
          ? Math.round((marks.reduce((sum, grade) => sum + grade, 0) / marks.length) * 100) / 100
          : null,
    };
  });

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    current_grading_period: gradingPeriod,
    grading_periods: GRADING_PERIODS,
    subjects,
  });
};




const listAttendance = async (req, res) => {
  const context = await resolveContext(req, res);

  if (!context) {
    return undefined;
  }

  const { studentId, activeAcademicYear, enrollment } = context;

  if (!enrollment) {
    return sendOk(res, {
      active_academic_year: activeAcademicYear,
      rate: null,
      counts: { present: 0, absent: 0, late: 0, excused: 0 },
      records: [],
    });
  }

  const [counts] = await pool.execute(
    `SELECT attendance.status, COUNT(*) AS total
     FROM attendance
     JOIN class_subjects ON class_subjects.id = attendance.class_subject_id
     WHERE attendance.student_id = ?
       AND class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?
     GROUP BY attendance.status`,
    [studentId, enrollment.section_id, activeAcademicYear.id],
  );

  const [records] = await pool.execute(
    `SELECT
       attendance.id,
       attendance.attendance_date,
       attendance.status,
       attendance.remarks,
       subjects.name AS subject_name
     FROM attendance
     JOIN class_subjects ON class_subjects.id = attendance.class_subject_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     WHERE attendance.student_id = ?
       AND class_subjects.section_id = ?
       AND class_subjects.academic_year_id = ?
     ORDER BY attendance.attendance_date DESC, subjects.name
     LIMIT ${MAX_ATTENDANCE_ROWS}`,
    [studentId, enrollment.section_id, activeAcademicYear.id],
  );

  const rate = await getAttendanceRate(studentId, enrollment.section_id, activeAcademicYear.id);

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    rate,
    counts: {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      ...Object.fromEntries(counts.map((row) => [row.status, Number(row.total)])),
    },
    records,
  });
};




const getProfile = async (req, res) => {
  const context = await resolveContext(req, res);

  if (!context) {
    return undefined;
  }

  const { studentId, activeAcademicYear, enrollment } = context;

  const [rows] = await pool.execute(
    `SELECT
       students.id,
       students.student_number,
       students.first_name,
       students.middle_name,
       students.last_name,
       students.birth_date,
       students.gender,
       students.address,
       students.contact_number,
       students.photo_id,
       users.email
     FROM students
     JOIN users ON users.id = students.user_id
     WHERE students.id = ?`,
    [studentId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student profile not found.');
  }

  const adviser = enrollment
    ? await getAdviser(enrollment.section_id, activeAcademicYear.id)
    : null;

  const [guardians] = await pool.execute(
    `SELECT
       parents.id,
       NULLIF(CONCAT_WS(' ', parents.first_name, parents.last_name), '') AS name,
       student_parents.relationship,
       student_parents.is_primary_contact,
       parents.contact_number,
       users.email
     FROM student_parents
     JOIN parents ON parents.id = student_parents.parent_id
     JOIN users ON users.id = parents.user_id
     WHERE student_parents.student_id = ?`,
    [studentId],
  );

  return sendOk(res, {
    student: rows[0],
    active_academic_year: activeAcademicYear,
    section_name: enrollment ? enrollment.section_name : null,
    grade_level_name: enrollment ? enrollment.grade_level_name : null,
    adviser,
    guardians,
  });
};

module.exports = {
  listClasses,
  getSchedule,
  listGrades,
  listAttendance,
  getProfile,
};
