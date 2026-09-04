const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateGradeLevel,
  validateUpdateGradeLevel,
  validatePagination,
} = require('../../validations/grade-level-validation');

const GRADE_LEVEL_SELECT_FIELDS = `
  id,
  name,
  level_number,
  created_at,
  updated_at
`;

const createGradeLevel = async (req, res) => {
  const validationErrors = validateCreateGradeLevel(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const name = req.body.name.trim();
  const levelNumber = req.body.level_number !== undefined && req.body.level_number !== null && req.body.level_number !== ''
    ? Number(req.body.level_number)
    : null;

  const [result] = await pool.execute(
    `INSERT INTO grade_levels (name, level_number) VALUES (?, ?)`,
    [name, levelNumber],
  );

  return sendCreated(res, {
    id: result.insertId,
    name,
    level_number: levelNumber,
  });
};

const createGradeLevelHandler = (req, res, next) =>
  createGradeLevel(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'A grade level with this name already exists.');
    }
    return next(error);
  });

const listGradeLevels = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search ? 'WHERE name LIKE ?' : '';
  const searchParams = search ? [`%${search}%`] : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM grade_levels ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${GRADE_LEVEL_SELECT_FIELDS}
     FROM grade_levels
     ${searchClause}
     ORDER BY level_number IS NULL, level_number ASC, name ASC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  // Key must be the literal string 'grade-levels' (hyphenated, matching the
  // resource name), not a JS identifier — the frontend's adminApi does
  // data[resource] with resource === 'grade-levels'.
  return sendOk(res, {
    'grade-levels': rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getGradeLevelById = async (req, res) => {
  const gradeLevelId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${GRADE_LEVEL_SELECT_FIELDS} FROM grade_levels WHERE id = ?`,
    [gradeLevelId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Grade level not found.');
  }

  return sendOk(res, rows[0]);
};

const UPDATE_FIELDS = ['name', 'level_number'];

const normalizeUpdateValue = (field, value) => {
  if (field === 'name' && typeof value === 'string') {
    return value.trim();
  }
  if (field === 'level_number') {
    return value === undefined || value === null || value === '' ? null : Number(value);
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

const updateGradeLevel = async (req, res) => {
  const validationErrors = validateUpdateGradeLevel(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const gradeLevelId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM grade_levels WHERE id = ?', [
    gradeLevelId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Grade level not found.');
  }

  const update = buildAssignments(req.body, UPDATE_FIELDS);

  await pool.execute(`UPDATE grade_levels SET ${update.clause} WHERE id = ?`, [
    ...update.values,
    gradeLevelId,
  ]);

  const [rows] = await pool.execute(
    `SELECT ${GRADE_LEVEL_SELECT_FIELDS} FROM grade_levels WHERE id = ?`,
    [gradeLevelId],
  );

  logger.info(`Grade level ${gradeLevelId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateGradeLevelHandler = (req, res, next) =>
  updateGradeLevel(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'A grade level with this name already exists.');
    }
    return next(error);
  });

const deleteGradeLevel = async (req, res) => {
  const gradeLevelId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM grade_levels WHERE id = ?', [
    gradeLevelId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Grade level not found.');
  }

  const [sectionRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM sections WHERE grade_level_id = ?',
    [gradeLevelId],
  );

  if (sectionRows[0].total > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Grade level has ${sectionRows[0].total} sections and cannot be deleted.`,
    );
  }

  await pool.execute('DELETE FROM grade_levels WHERE id = ?', [gradeLevelId]);

  logger.info(`Grade level ${gradeLevelId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteGradeLevelHandler = (req, res, next) =>
  deleteGradeLevel(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Grade level is referenced by other records and cannot be deleted.',
      );
    }
    return next(error);
  });

module.exports = {
  createGradeLevel: createGradeLevelHandler,
  listGradeLevels,
  getGradeLevelById,
  updateGradeLevel: updateGradeLevelHandler,
  deleteGradeLevel: deleteGradeLevelHandler,
};
