const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { findOpenSection, findSectionWithHeadcount } = require('../../utils/section-assignment');
const { validatePagination } = require('../../validations/student-validation');
const {
  validateCreateEnrollment,
  validateMoveEnrollment,
  parsePositiveInteger,
} = require('../../validations/enrollment-validation');




const findAcademicYear = async (academicYearId) => {
  if (academicYearId) {
    const [rows] = await pool.execute('SELECT id, name FROM academic_years WHERE id = ?', [
      academicYearId,
    ]);

    return rows[0] || null;
  }

  const [rows] = await pool.execute(
    "SELECT id, name FROM academic_years WHERE status = 'active' LIMIT 1",
  );

  return rows[0] || null;
};

const STUDENT_NAME_EXPR = "CONCAT_WS(' ', students.first_name, students.last_name)";




const listEnrollments = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const academicYear = await findAcademicYear(parsePositiveInteger(req.query.academic_year_id));

  if (!academicYear) {
    return sendOk(res, {
      academic_year: null,
      enrollments: [],
      pagination: { page, limit, total: 0, pages: 0 },
    });
  }

  const unassignedOnly = req.query.unassigned === 'true';
  const conditions = [];
  const params = [academicYear.id];

  if (unassignedOnly) {
    conditions.push('enrollments.id IS NULL');
  }

  if (req.query.grade_level_id) {
    const gradeLevelId = parsePositiveInteger(req.query.grade_level_id);

    if (!gradeLevelId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Grade level must be a valid selection.');
    }

    conditions.push('sections.grade_level_id = ?');
    params.push(gradeLevelId);
  }

  if (req.query.section_id) {
    const sectionId = parsePositiveInteger(req.query.section_id);

    if (!sectionId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Section must be a valid selection.');
    }

    conditions.push('enrollments.section_id = ?');
    params.push(sectionId);
  }

  if (search) {
    conditions.push(`(${STUDENT_NAME_EXPR} LIKE ? OR users.email LIKE ?)`);
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';




  const fromClause = `
    FROM students
    LEFT JOIN users ON users.id = students.user_id
    LEFT JOIN enrollments
           ON enrollments.student_id = students.id
          AND enrollments.academic_year_id = ?
          AND enrollments.status = 'active'
    LEFT JOIN sections ON sections.id = enrollments.section_id
    LEFT JOIN grade_levels ON grade_levels.id = sections.grade_level_id
    ${whereClause}`;

  const [rows] = await pool.execute(
    `SELECT
       students.id AS student_id,
       students.first_name,
       students.last_name,
       users.email,
       enrollments.id AS enrollment_id,
       enrollments.status AS enrollment_status,
       enrollments.enrollment_date,
       sections.id AS section_id,
       sections.name AS section_name,
       sections.capacity,
       grade_levels.id AS grade_level_id,
       grade_levels.name AS grade_level_name
     ${fromClause}
     ORDER BY students.last_name, students.first_name
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${fromClause}`,
    params,
  );

  return sendOk(res, {
    academic_year: academicYear,
    enrollments: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};




const listSectionCapacity = async (req, res) => {
  const academicYear = await findAcademicYear(parsePositiveInteger(req.query.academic_year_id));

  if (!academicYear) {
    return sendOk(res, { academic_year: null, sections: [] });
  }

  const [rows] = await pool.execute(
    `SELECT
       sections.id,
       sections.name,
       sections.capacity,
       grade_levels.id AS grade_level_id,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = sections.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active') AS student_count
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name`,
    [academicYear.id],
  );

  return sendOk(res, { academic_year: academicYear, sections: rows });
};

const findStudentGradeLevel = async (studentId) => {
  const [rows] = await pool.execute('SELECT id FROM students WHERE id = ?', [studentId]);

  return rows[0] || null;
};




const createEnrollment = async (req, res) => {
  const validationErrors = validateCreateEnrollment(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const studentId = parsePositiveInteger(req.body.student_id);
  const sectionId = parsePositiveInteger(req.body.section_id);
  const gradeLevelId = parsePositiveInteger(req.body.grade_level_id);

  const student = await findStudentGradeLevel(studentId);

  if (!student) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  const academicYear = await findAcademicYear(parsePositiveInteger(req.body.academic_year_id));

  if (!academicYear) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'No school year is marked active. Set one before enrolling students.',
    );
  }

  const [existing] = await pool.execute(
    'SELECT id, status FROM enrollments WHERE student_id = ? AND academic_year_id = ?',
    [studentId, academicYear.id],
  );

  if (existing.length > 0 && existing[0].status === 'active') {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'This student is already enrolled for that school year.',
    );
  }

  let section;




  if (sectionId) {
    section = await findSectionWithHeadcount(pool, { sectionId, academicYearId: academicYear.id });

    if (!section) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
    }

    if (Number(section.student_count) >= Number(section.capacity) && req.body.override !== true) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `${section.grade_level_name} ${section.name} is full (${section.student_count}/${section.capacity}).`,
      );
    }
  } else {
    if (!gradeLevelId) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Choose a section, or a grade level to place the student automatically.',
      );
    }

    const { section: openSection, reason } = await findOpenSection(pool, {
      gradeLevelId,
      academicYearId: academicYear.id,
    });

    if (!openSection) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        reason === 'no_sections'
          ? 'That grade level has no sections yet.'
          : 'Every section for that grade level is full. Choose one to over-fill it.',
      );
    }

    section = openSection;
  }




  if (existing.length > 0) {
    await pool.execute(
      `UPDATE enrollments
       SET section_id = ?, status = 'active', enrollment_date = CURDATE()
       WHERE id = ?`,
      [section.id, existing[0].id],
    );
  } else {
    await pool.execute(
      `INSERT INTO enrollments (student_id, academic_year_id, section_id, enrollment_date, status)
       VALUES (?, ?, ?, CURDATE(), 'active')`,
      [studentId, academicYear.id, section.id],
    );
  }

  logger.info(
    `Student ${studentId} enrolled in section ${section.id} for year ${academicYear.id} by admin ${req.user.userId}`,
  );

  return sendCreated(res, {
    student_id: studentId,
    section_id: section.id,
    section_name: section.name,
    grade_level_name: section.grade_level_name,
    academic_year: academicYear,
  });
};




const moveEnrollment = async (req, res) => {
  const enrollmentId = parsePositiveInteger(req.params.id);

  if (!enrollmentId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid enrollment id.');
  }

  const validationErrors = validateMoveEnrollment(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const [rows] = await pool.execute(
    'SELECT id, student_id, academic_year_id, section_id FROM enrollments WHERE id = ?',
    [enrollmentId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Enrollment not found.');
  }

  const enrollment = rows[0];
  const sectionId = parsePositiveInteger(req.body.section_id);
  const section = await findSectionWithHeadcount(pool, {
    sectionId,
    academicYearId: enrollment.academic_year_id,
  });

  if (!section) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
  }




  const alreadyCounted = enrollment.section_id === section.id;

  if (
    !alreadyCounted
    && Number(section.student_count) >= Number(section.capacity)
    && req.body.override !== true
  ) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `${section.grade_level_name} ${section.name} is full (${section.student_count}/${section.capacity}).`,
    );
  }

  await pool.execute('UPDATE enrollments SET section_id = ? WHERE id = ?', [
    section.id,
    enrollmentId,
  ]);

  logger.info(
    `Enrollment ${enrollmentId} moved to section ${section.id} by admin ${req.user.userId}`,
  );

  return sendOk(res, {
    id: enrollmentId,
    student_id: enrollment.student_id,
    section_id: section.id,
    section_name: section.name,
    grade_level_name: section.grade_level_name,
  });
};




const dropEnrollment = async (req, res) => {
  const enrollmentId = parsePositiveInteger(req.params.id);

  if (!enrollmentId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid enrollment id.');
  }

  const [result] = await pool.execute(
    "UPDATE enrollments SET status = 'dropped' WHERE id = ?",
    [enrollmentId],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Enrollment not found.');
  }

  logger.info(`Enrollment ${enrollmentId} dropped by admin ${req.user.userId}`);

  return sendOk(res, { id: enrollmentId, status: 'dropped' });
};

module.exports = {
  listEnrollments,
  listSectionCapacity,
  createEnrollment,
  moveEnrollment,
  dropEnrollment,
};
