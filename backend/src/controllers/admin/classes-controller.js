const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateAdvisoryClass,
  validateUpdateAdvisoryClass,
  validatePagination,
} = require('../../validations/advisory-class-validation');

// NOTE ON NAMING: the table is `advisory_classes`, but everywhere in the API
// surface — the URL segment (/admin/classes), the response key (`classes`)
// and the frontend resource key — this is shortened to just "classes". That
// is intentional, not a typo: "advisory class" is what the section+adviser
// pairing is called academically, and the shorter name is what the UI shows.

// student_count is a correlated subquery rather than a JOIN + GROUP BY:
// a JOIN would multiply the advisory_classes row once per enrolled student,
// which would break the ORDER BY / LIMIT pagination below.
const CLASS_SELECT_FIELDS = `
  advisory_classes.id,
  advisory_classes.section_id,
  advisory_classes.academic_year_id,
  advisory_classes.teacher_id,
  advisory_classes.created_at,
  advisory_classes.updated_at,
  sections.name AS section_name,
  grade_levels.name AS grade_level_name,
  academic_years.name AS academic_year_name,
  CONCAT_WS(' ', teachers.first_name, teachers.last_name) AS teacher_name,
  (
    SELECT COUNT(*)
    FROM enrollments
    WHERE enrollments.section_id = advisory_classes.section_id
      AND enrollments.academic_year_id = advisory_classes.academic_year_id
      AND enrollments.status = 'active'
  ) AS student_count
`;

const CLASS_JOINS = `
  FROM advisory_classes
  JOIN sections ON sections.id = advisory_classes.section_id
  JOIN grade_levels ON grade_levels.id = sections.grade_level_id
  JOIN academic_years ON academic_years.id = advisory_classes.academic_year_id
  JOIN teachers ON teachers.id = advisory_classes.teacher_id
`;

const CLASS_ORDER = `
  ORDER BY academic_years.name ASC, grade_levels.level_number ASC, sections.name ASC
`;

// Mirrors findGradeLevel in sections-controller.js: validate each foreign
// key up front so a bad id surfaces as a 400 from us, not a 500 from the
// FK constraint.
const findSection = async (sectionId) => {
  const [rows] = await pool.execute('SELECT id FROM sections WHERE id = ?', [sectionId]);
  return rows[0] || null;
};

const findAcademicYear = async (academicYearId) => {
  const [rows] = await pool.execute('SELECT id FROM academic_years WHERE id = ?', [
    academicYearId,
  ]);
  return rows[0] || null;
};

const findTeacher = async (teacherId) => {
  const [rows] = await pool.execute('SELECT id FROM teachers WHERE id = ?', [teacherId]);
  return rows[0] || null;
};

const createAdvisoryClass = async (req, res) => {
  const validationErrors = validateCreateAdvisoryClass(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const sectionId = Number(req.body.section_id);
  const academicYearId = Number(req.body.academic_year_id);
  const teacherId = Number(req.body.teacher_id);

  const [section, academicYear, teacher] = await Promise.all([
    findSection(sectionId),
    findAcademicYear(academicYearId),
    findTeacher(teacherId),
  ]);

  if (!section) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Section is not valid.');
  }

  if (!academicYear) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'School year is not valid.');
  }

  if (!teacher) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Teacher is not valid.');
  }

  const [result] = await pool.execute(
    `INSERT INTO advisory_classes (section_id, academic_year_id, teacher_id) VALUES (?, ?, ?)`,
    [sectionId, academicYearId, teacherId],
  );

  const [rows] = await pool.execute(
    `SELECT ${CLASS_SELECT_FIELDS} ${CLASS_JOINS} WHERE advisory_classes.id = ?`,
    [result.insertId],
  );

  return sendCreated(res, rows[0]);
};

const createAdvisoryClassHandler = (req, res, next) =>
  createAdvisoryClass(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'This section already has an adviser for that school year.',
      );
    }
    return next(error);
  });

const listAdvisoryClasses = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? `WHERE (
        sections.name LIKE ?
        OR academic_years.name LIKE ?
        OR CONCAT_WS(' ', teachers.first_name, teachers.last_name) LIKE ?
      )`
    : '';
  const searchParams = search ? Array(3).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total ${CLASS_JOINS} ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${CLASS_SELECT_FIELDS}
     ${CLASS_JOINS}
     ${searchClause}
     ${CLASS_ORDER}
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  // Response key `classes` mirrors the /admin/classes URL segment; see the
  // naming note at the top of this file.
  return sendOk(res, {
    classes: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

// Students are not editable on an advisory class; they come from enrollment.
// This list is derived and read-only, returned alongside the class on the
// detail view only (not on the list endpoint, to keep that query cheap).
const findEnrolledStudents = (sectionId, academicYearId) =>
  pool
    .execute(
      `SELECT students.id, students.first_name, students.last_name
       FROM enrollments
       JOIN students ON students.id = enrollments.student_id
       WHERE enrollments.section_id = ?
         AND enrollments.academic_year_id = ?
         AND enrollments.status = 'active'
       ORDER BY students.last_name, students.first_name`,
      [sectionId, academicYearId],
    )
    .then(([rows]) => rows);

const getAdvisoryClassById = async (req, res) => {
  const classId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${CLASS_SELECT_FIELDS} ${CLASS_JOINS} WHERE advisory_classes.id = ?`,
    [classId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Advisory class not found.');
  }

  const advisoryClass = rows[0];
  const students = await findEnrolledStudents(
    advisoryClass.section_id,
    advisoryClass.academic_year_id,
  );

  return sendOk(res, { ...advisoryClass, students });
};

const UPDATE_FIELDS = ['section_id', 'academic_year_id', 'teacher_id'];

const buildAssignments = (body, allowedFields) => {
  const columns = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    columns.push(`${field} = ?`);
    values.push(Number(body[field]));
  });

  return { clause: columns.join(', '), values };
};

const updateAdvisoryClass = async (req, res) => {
  const validationErrors = validateUpdateAdvisoryClass(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const classId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM advisory_classes WHERE id = ?', [
    classId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Advisory class not found.');
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'section_id')) {
    const section = await findSection(Number(req.body.section_id));

    if (!section) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Section is not valid.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'academic_year_id')) {
    const academicYear = await findAcademicYear(Number(req.body.academic_year_id));

    if (!academicYear) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'School year is not valid.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'teacher_id')) {
    const teacher = await findTeacher(Number(req.body.teacher_id));

    if (!teacher) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Teacher is not valid.');
    }
  }

  const update = buildAssignments(req.body, UPDATE_FIELDS);

  await pool.execute(`UPDATE advisory_classes SET ${update.clause} WHERE id = ?`, [
    ...update.values,
    classId,
  ]);

  const [rows] = await pool.execute(
    `SELECT ${CLASS_SELECT_FIELDS} ${CLASS_JOINS} WHERE advisory_classes.id = ?`,
    [classId],
  );

  logger.info(`Advisory class ${classId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateAdvisoryClassHandler = (req, res, next) =>
  updateAdvisoryClass(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'This section already has an adviser for that school year.',
      );
    }
    return next(error);
  });

// Nothing references advisory_classes, so a delete is unconditional.
const deleteAdvisoryClass = async (req, res) => {
  const classId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM advisory_classes WHERE id = ?', [
    classId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Advisory class not found.');
  }

  await pool.execute('DELETE FROM advisory_classes WHERE id = ?', [classId]);

  logger.info(`Advisory class ${classId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteAdvisoryClassHandler = (req, res, next) =>
  deleteAdvisoryClass(req, res).catch((error) => next(error));

module.exports = {
  createAdvisoryClass: createAdvisoryClassHandler,
  listAdvisoryClasses,
  getAdvisoryClassById,
  updateAdvisoryClass: updateAdvisoryClassHandler,
  deleteAdvisoryClass: deleteAdvisoryClassHandler,
};
