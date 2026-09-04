const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateSchedule,
  validateUpdateSchedule,
  validatePagination,
} = require('../../validations/schedule-validation');

const SCHEDULE_SELECT_FIELDS = `
  schedules.id,
  schedules.class_subject_id,
  schedules.day_of_week,
  schedules.start_time,
  schedules.end_time,
  schedules.room,
  schedules.created_at,
  schedules.updated_at,
  sections.id AS section_id,
  sections.name AS section_name,
  subjects.id AS subject_id,
  subjects.code AS subject_code,
  subjects.name AS subject_name,
  teachers.id AS teacher_id,
  CONCAT_WS(' ', teachers.first_name, teachers.last_name) AS teacher_name,
  academic_years.id AS academic_year_id,
  academic_years.name AS academic_year_name
`;

const SCHEDULE_JOINS = `
  FROM schedules
  JOIN class_subjects ON class_subjects.id = schedules.class_subject_id
  JOIN sections ON sections.id = class_subjects.section_id
  JOIN subjects ON subjects.id = class_subjects.subject_id
  JOIN teachers ON teachers.id = class_subjects.teacher_id
  JOIN academic_years ON academic_years.id = class_subjects.academic_year_id
`;

// Mirrors findGradeLevel in sections-controller.js: resolve each foreign key
// up front so a bad id surfaces as a 400 with a specific message, not a 500
// from the class_subjects/schedules FK constraints.
const findSection = async (sectionId) => {
  const [rows] = await pool.execute('SELECT id FROM sections WHERE id = ?', [sectionId]);
  return rows[0] || null;
};

const findSubject = async (subjectId) => {
  const [rows] = await pool.execute('SELECT id FROM subjects WHERE id = ?', [subjectId]);
  return rows[0] || null;
};

const findTeacher = async (teacherId) => {
  const [rows] = await pool.execute('SELECT id FROM teachers WHERE id = ?', [teacherId]);
  return rows[0] || null;
};

const findAcademicYear = async (academicYearId) => {
  const [rows] = await pool.execute('SELECT id FROM academic_years WHERE id = ?', [
    academicYearId,
  ]);
  return rows[0] || null;
};

// Validates the four class_subjects parts a caller thinks in terms of
// ("this teacher teaches this subject to this section this year"), each
// against its own table so the error names the specific bad field.
const validateClassSubjectParts = async ({ sectionId, subjectId, teacherId, academicYearId }) => {
  const [section, subject, teacher, academicYear] = await Promise.all([
    findSection(sectionId),
    findSubject(subjectId),
    findTeacher(teacherId),
    findAcademicYear(academicYearId),
  ]);

  if (!section) {
    return 'Section is not valid.';
  }
  if (!subject) {
    return 'Subject is not valid.';
  }
  if (!teacher) {
    return 'Teacher is not valid.';
  }
  if (!academicYear) {
    return 'School year is not valid.';
  }
  return null;
};

// class_subjects is the join row representing "this teacher teaches this
// subject to this section this year". There is no screen to manage it
// directly, so the schedule API finds the existing row or creates it as
// part of writing the schedule.
const findOrCreateClassSubjectId = async (
  connection,
  { sectionId, subjectId, teacherId, academicYearId },
) => {
  const [existing] = await connection.execute(
    `SELECT id FROM class_subjects
     WHERE section_id = ? AND subject_id = ? AND teacher_id = ? AND academic_year_id = ?`,
    [sectionId, subjectId, teacherId, academicYearId],
  );

  if (existing[0]) {
    return existing[0].id;
  }

  const [result] = await connection.execute(
    `INSERT INTO class_subjects (section_id, subject_id, teacher_id, academic_year_id)
     VALUES (?, ?, ?, ?)`,
    [sectionId, subjectId, teacherId, academicYearId],
  );

  return result.insertId;
};

// Overlap test: two ranges [new_start, new_end) and [existing_start, existing_end)
// overlap unless one ends before or exactly when the other starts. Negating
// that ("new starts before existing ends" AND "new ends after existing
// starts") gives the overlap condition below -- it reads as backwards at a
// glance because it is phrased as "not disjoint", not "overlapping".
const CLASH_SELECT = `
  SELECT schedules.id
  FROM schedules
  JOIN class_subjects ON class_subjects.id = schedules.class_subject_id
  WHERE class_subjects.academic_year_id = ?
    AND schedules.day_of_week = ?
    AND ? < schedules.end_time
    AND ? > schedules.start_time
`;

const findClash = async (connection, { academicYearId, dayOfWeek, startTime, endTime, column, id, excludeScheduleId }) => {
  const params = [academicYearId, dayOfWeek, startTime, endTime];
  let query = `${CLASH_SELECT} AND class_subjects.${column} = ?`;
  params.push(id);

  if (excludeScheduleId) {
    query += ' AND schedules.id != ?';
    params.push(excludeScheduleId);
  }

  const [rows] = await connection.execute(query, params);
  return rows.length > 0;
};

const checkForClashes = async (
  connection,
  { academicYearId, dayOfWeek, startTime, endTime, teacherId, sectionId, excludeScheduleId },
) => {
  const teacherClash = await findClash(connection, {
    academicYearId,
    dayOfWeek,
    startTime,
    endTime,
    column: 'teacher_id',
    id: teacherId,
    excludeScheduleId,
  });

  if (teacherClash) {
    return 'Teacher already has a class at that time.';
  }

  const sectionClash = await findClash(connection, {
    academicYearId,
    dayOfWeek,
    startTime,
    endTime,
    column: 'section_id',
    id: sectionId,
    excludeScheduleId,
  });

  if (sectionClash) {
    return 'Section already has a class at that time.';
  }

  return null;
};

const createSchedule = async (req, res) => {
  const validationErrors = validateCreateSchedule(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const sectionId = Number(req.body.section_id);
  const subjectId = Number(req.body.subject_id);
  const teacherId = Number(req.body.teacher_id);
  const academicYearId = Number(req.body.academic_year_id);
  const dayOfWeek = req.body.day_of_week;
  const startTime = req.body.start_time;
  const endTime = req.body.end_time;
  const room = req.body.room !== undefined && req.body.room !== null && req.body.room !== ''
    ? req.body.room.trim()
    : null;

  const partsError = await validateClassSubjectParts({
    sectionId,
    subjectId,
    teacherId,
    academicYearId,
  });

  if (partsError) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, partsError);
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const scheduleId = await (async () => {
    const clash = await checkForClashes(connection, {
      academicYearId,
      dayOfWeek,
      startTime,
      endTime,
      teacherId,
      sectionId,
    });

    if (clash) {
      const error = new Error(clash);
      error.isClash = true;
      throw error;
    }

    const classSubjectId = await findOrCreateClassSubjectId(connection, {
      sectionId,
      subjectId,
      teacherId,
      academicYearId,
    });

    const [result] = await connection.execute(
      `INSERT INTO schedules (class_subject_id, day_of_week, start_time, end_time, room)
       VALUES (?, ?, ?, ?, ?)`,
      [classSubjectId, dayOfWeek, startTime, endTime, room],
    );

    return result.insertId;
  })()
    .then((id) => connection.commit().then(() => id))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${SCHEDULE_SELECT_FIELDS} ${SCHEDULE_JOINS} WHERE schedules.id = ?`,
    [scheduleId],
  );

  return sendCreated(res, rows[0]);
};

const createScheduleHandler = (req, res, next) =>
  createSchedule(req, res).catch((error) => {
    if (error.isClash) {
      return sendError(res, HTTP_STATUS.CONFLICT, error.message);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'That class is already scheduled at this time.');
    }
    return next(error);
  });

const listSchedules = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? 'WHERE sections.name LIKE ? OR subjects.code LIKE ? OR subjects.name LIKE ? OR teachers.first_name LIKE ? OR teachers.last_name LIKE ?'
    : '';
  const searchParams = search ? Array(5).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total ${SCHEDULE_JOINS} ${searchClause}`,
    searchParams,
  );

  // FIELD() orders by the listed sequence rather than alphabetically --
  // without it, 'Friday' sorts before 'Monday' and the schedule reads wrong.
  const [rows] = await pool.query(
    `SELECT ${SCHEDULE_SELECT_FIELDS}
     ${SCHEDULE_JOINS}
     ${searchClause}
     ORDER BY FIELD(schedules.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
              schedules.start_time
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    schedules: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getScheduleById = async (req, res) => {
  const scheduleId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${SCHEDULE_SELECT_FIELDS} ${SCHEDULE_JOINS} WHERE schedules.id = ?`,
    [scheduleId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Schedule not found.');
  }

  return sendOk(res, rows[0]);
};

const updateSchedule = async (req, res) => {
  const validationErrors = validateUpdateSchedule(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const scheduleId = req.params.id;

  const [existingRows] = await pool.execute(
    `SELECT schedules.id, schedules.day_of_week, schedules.start_time, schedules.end_time, schedules.room,
            class_subjects.section_id, class_subjects.subject_id, class_subjects.teacher_id, class_subjects.academic_year_id
     FROM schedules
     JOIN class_subjects ON class_subjects.id = schedules.class_subject_id
     WHERE schedules.id = ?`,
    [scheduleId],
  );

  if (existingRows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Schedule not found.');
  }

  const existing = existingRows[0];

  // Merge provided fields onto the current row so a partial update (e.g.
  // only room) is still validated/clash-checked against the full picture.
  const sectionId = Object.prototype.hasOwnProperty.call(req.body, 'section_id')
    ? Number(req.body.section_id)
    : existing.section_id;
  const subjectId = Object.prototype.hasOwnProperty.call(req.body, 'subject_id')
    ? Number(req.body.subject_id)
    : existing.subject_id;
  const teacherId = Object.prototype.hasOwnProperty.call(req.body, 'teacher_id')
    ? Number(req.body.teacher_id)
    : existing.teacher_id;
  const academicYearId = Object.prototype.hasOwnProperty.call(req.body, 'academic_year_id')
    ? Number(req.body.academic_year_id)
    : existing.academic_year_id;
  const dayOfWeek = Object.prototype.hasOwnProperty.call(req.body, 'day_of_week')
    ? req.body.day_of_week
    : existing.day_of_week;
  const startTime = Object.prototype.hasOwnProperty.call(req.body, 'start_time')
    ? req.body.start_time
    : existing.start_time;
  const endTime = Object.prototype.hasOwnProperty.call(req.body, 'end_time')
    ? req.body.end_time
    : existing.end_time;
  const room = Object.prototype.hasOwnProperty.call(req.body, 'room')
    ? (req.body.room !== null && req.body.room !== '' ? req.body.room.trim() : null)
    : existing.room;

  const partsError = await validateClassSubjectParts({
    sectionId,
    subjectId,
    teacherId,
    academicYearId,
  });

  if (partsError) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, partsError);
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await (async () => {
    const clash = await checkForClashes(connection, {
      academicYearId,
      dayOfWeek,
      startTime,
      endTime,
      teacherId,
      sectionId,
      excludeScheduleId: scheduleId,
    });

    if (clash) {
      const error = new Error(clash);
      error.isClash = true;
      throw error;
    }

    const classSubjectId = await findOrCreateClassSubjectId(connection, {
      sectionId,
      subjectId,
      teacherId,
      academicYearId,
    });

    await connection.execute(
      `UPDATE schedules
       SET class_subject_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ?
       WHERE id = ?`,
      [classSubjectId, dayOfWeek, startTime, endTime, room, scheduleId],
    );
  })()
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${SCHEDULE_SELECT_FIELDS} ${SCHEDULE_JOINS} WHERE schedules.id = ?`,
    [scheduleId],
  );

  logger.info(`Schedule ${scheduleId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateScheduleHandler = (req, res, next) =>
  updateSchedule(req, res).catch((error) => {
    if (error.isClash) {
      return sendError(res, HTTP_STATUS.CONFLICT, error.message);
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'That class is already scheduled at this time.');
    }
    return next(error);
  });

const deleteSchedule = async (req, res) => {
  const scheduleId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM schedules WHERE id = ?', [scheduleId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Schedule not found.');
  }

  // Only the schedule row is removed. class_subjects is left in place --
  // other schedules or grades may reference the same teacher/subject/section/
  // year combination.
  await pool.execute('DELETE FROM schedules WHERE id = ?', [scheduleId]);

  logger.info(`Schedule ${scheduleId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteScheduleHandler = (req, res, next) =>
  deleteSchedule(req, res).catch((error) => next(error));

module.exports = {
  createSchedule: createScheduleHandler,
  listSchedules,
  getScheduleById,
  updateSchedule: updateScheduleHandler,
  deleteSchedule: deleteScheduleHandler,
};
