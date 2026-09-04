const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
  validatePagination,
} = require('../../validations/academic-year-validation');

const ACADEMIC_YEAR_SELECT_FIELDS = `
  id,
  name,
  start_date,
  end_date,
  status,
  created_at,
  updated_at
`;

// Demotes any other row currently marked active. Two concurrent "current"
// years would let enrollments and schedules be written against both, so at
// most one row may hold status = 'active' at a time.
const demoteOtherActiveYears = (connection, excludeId) =>
  connection.execute(
    `UPDATE academic_years SET status = 'completed' WHERE status = 'active' AND id <> ?`,
    [excludeId ?? 0],
  );

const createAcademicYear = async (req, res) => {
  const validationErrors = validateCreateAcademicYear(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const name = req.body.name.trim();
  const startDate = req.body.start_date;
  const endDate = req.body.end_date;
  const status = req.body.status || 'upcoming';

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const academicYearId = await Promise.resolve()
    .then(() => (status === 'active' ? demoteOtherActiveYears(connection, null) : null))
    .then(() =>
      connection.execute(
        `INSERT INTO academic_years (name, start_date, end_date, status)
         VALUES (?, ?, ?, ?)`,
        [name, startDate, endDate, status],
      ),
    )
    .then(([result]) => result.insertId)
    .then((id) => connection.commit().then(() => id))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return sendCreated(res, {
    id: academicYearId,
    name,
    start_date: startDate,
    end_date: endDate,
    status,
  });
};

const createAcademicYearHandler = (req, res, next) =>
  createAcademicYear(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'An academic year with this name already exists.');
    }
    return next(error);
  });

const listAcademicYears = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search ? 'WHERE name LIKE ?' : '';
  const searchParams = search ? [`%${search}%`] : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM academic_years ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${ACADEMIC_YEAR_SELECT_FIELDS}
     FROM academic_years
     ${searchClause}
     ORDER BY start_date DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  // Key must be the literal string 'academic-years' (hyphenated, matching the
  // resource name), not a JS identifier — the frontend's adminApi does
  // data[resource] with resource === 'academic-years'.
  return sendOk(res, {
    'academic-years': rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getAcademicYearById = async (req, res) => {
  const academicYearId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${ACADEMIC_YEAR_SELECT_FIELDS} FROM academic_years WHERE id = ?`,
    [academicYearId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Academic year not found.');
  }

  return sendOk(res, rows[0]);
};

const UPDATE_FIELDS = ['name', 'start_date', 'end_date', 'status'];

const normalizeUpdateValue = (field, value) => {
  if (field === 'name' && typeof value === 'string') {
    return value.trim();
  }
  return value;
};

const buildAssignments = (body, allowedFields) => {
  const columns = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    columns.push(`${field} = ?`);
    values.push(normalizeUpdateValue(field, body[field]));
  });

  return { clause: columns.join(', '), values };
};

const updateAcademicYear = async (req, res) => {
  const validationErrors = validateUpdateAcademicYear(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const academicYearId = req.params.id;

  const [existing] = await pool.execute(
    'SELECT id, start_date, end_date, status FROM academic_years WHERE id = ?',
    [academicYearId],
  );

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Academic year not found.');
  }

  // Only one of start_date/end_date may be provided on an update, so the
  // range check against the validator's own payload can pass while the
  // effective range (mixing the new value with the stored one) is invalid.
  const effectiveStartDate = Object.prototype.hasOwnProperty.call(req.body, 'start_date')
    ? req.body.start_date
    : existing[0].start_date;
  const effectiveEndDate = Object.prototype.hasOwnProperty.call(req.body, 'end_date')
    ? req.body.end_date
    : existing[0].end_date;

  if (new Date(effectiveEndDate) <= new Date(effectiveStartDate)) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'End date must be after start date.');
  }

  const update = buildAssignments(req.body, UPDATE_FIELDS);
  const settingActive = req.body.status === 'active';

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await Promise.resolve()
    .then(() => (settingActive ? demoteOtherActiveYears(connection, academicYearId) : null))
    .then(() =>
      connection.execute(`UPDATE academic_years SET ${update.clause} WHERE id = ?`, [
        ...update.values,
        academicYearId,
      ]),
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${ACADEMIC_YEAR_SELECT_FIELDS} FROM academic_years WHERE id = ?`,
    [academicYearId],
  );

  logger.info(`Academic year ${academicYearId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateAcademicYearHandler = (req, res, next) =>
  updateAcademicYear(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'An academic year with this name already exists.');
    }
    return next(error);
  });

const ACADEMIC_YEAR_DEPENDENCIES = [
  { table: 'enrollments', label: 'enrollments' },
  { table: 'class_subjects', label: 'class subjects' },
];

const countAcademicYearDependencies = async (academicYearId) => {
  const counts = await Promise.all(
    ACADEMIC_YEAR_DEPENDENCIES.map(({ table, label }) =>
      pool
        .execute(`SELECT COUNT(*) AS total FROM ${table} WHERE academic_year_id = ?`, [
          academicYearId,
        ])
        .then(([rows]) => ({ label, total: rows[0].total })),
    ),
  );

  return counts.filter((entry) => entry.total > 0);
};

const deleteAcademicYear = async (req, res) => {
  const academicYearId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM academic_years WHERE id = ?', [
    academicYearId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Academic year not found.');
  }

  const blocking = await countAcademicYearDependencies(academicYearId);

  if (blocking.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Academic year has ${blocking.map((entry) => `${entry.total} ${entry.label}`).join(', ')} and cannot be deleted.`,
    );
  }

  await pool.execute('DELETE FROM academic_years WHERE id = ?', [academicYearId]);

  logger.info(`Academic year ${academicYearId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteAcademicYearHandler = (req, res, next) =>
  deleteAcademicYear(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Academic year is referenced by other records and cannot be deleted.',
      );
    }
    return next(error);
  });

module.exports = {
  createAcademicYear: createAcademicYearHandler,
  listAcademicYears,
  getAcademicYearById,
  updateAcademicYear: updateAcademicYearHandler,
  deleteAcademicYear: deleteAcademicYearHandler,
};
