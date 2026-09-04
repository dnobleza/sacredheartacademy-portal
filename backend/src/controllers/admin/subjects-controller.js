const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateSubject,
  validateUpdateSubject,
  validatePagination,
} = require('../../validations/subject-validation');

const SUBJECT_SELECT_FIELDS = `
  id,
  code,
  name,
  description,
  created_at,
  updated_at
`;

// Codes are identifiers, so they are stored uppercase. Without this, 'eng' and
// 'ENG' would pass UNIQUE(code) as two separate subjects.
const normalizeCode = (code) => code.trim().toUpperCase();

const createSubject = async (req, res) => {
  const validationErrors = validateCreateSubject(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const code = normalizeCode(req.body.code);
  const name = req.body.name.trim();
  const description = req.body.description ? req.body.description.trim() : null;

  const [result] = await pool.execute(
    'INSERT INTO subjects (code, name, description) VALUES (?, ?, ?)',
    [code, name, description],
  );

  return sendCreated(res, {
    id: result.insertId,
    code,
    name,
    description,
  });
};

const createSubjectHandler = (req, res, next) =>
  createSubject(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'A subject with this code already exists.');
    }
    return next(error);
  });

const listSubjects = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search ? 'WHERE (code LIKE ? OR name LIKE ?)' : '';
  const searchParams = search ? Array(2).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM subjects ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${SUBJECT_SELECT_FIELDS}
     FROM subjects
     ${searchClause}
     ORDER BY code
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    subjects: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getSubjectById = async (req, res) => {
  const subjectId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${SUBJECT_SELECT_FIELDS} FROM subjects WHERE id = ?`,
    [subjectId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Subject not found.');
  }

  return sendOk(res, rows[0]);
};

const UPDATE_FIELDS = ['code', 'name', 'description'];

const normalizeUpdateValue = (field, value) => {
  if (field === 'code') {
    return normalizeCode(value);
  }

  if (field === 'description') {
    return value === undefined || value === null || value === '' ? null : value.trim();
  }

  if (typeof value === 'string') {
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

const updateSubject = async (req, res) => {
  const validationErrors = validateUpdateSubject(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const subjectId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM subjects WHERE id = ?', [subjectId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Subject not found.');
  }

  const update = buildAssignments(req.body, UPDATE_FIELDS);

  await pool.execute(`UPDATE subjects SET ${update.clause} WHERE id = ?`, [
    ...update.values,
    subjectId,
  ]);

  const [rows] = await pool.execute(
    `SELECT ${SUBJECT_SELECT_FIELDS} FROM subjects WHERE id = ?`,
    [subjectId],
  );

  logger.info(`Subject ${subjectId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateSubjectHandler = (req, res, next) =>
  updateSubject(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'A subject with this code already exists.');
    }
    return next(error);
  });

const SUBJECT_DEPENDENCIES = [
  { table: 'teacher_subjects', label: 'teacher assignments' },
  { table: 'class_subjects', label: 'class subjects' },
];

const countSubjectDependencies = async (subjectId) => {
  const counts = await Promise.all(
    SUBJECT_DEPENDENCIES.map(({ table, label }) =>
      pool
        .execute(`SELECT COUNT(*) AS total FROM ${table} WHERE subject_id = ?`, [subjectId])
        .then(([rows]) => ({ label, total: rows[0].total })),
    ),
  );

  return counts.filter((entry) => entry.total > 0);
};

const deleteSubject = async (req, res) => {
  const subjectId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM subjects WHERE id = ?', [subjectId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Subject not found.');
  }

  const blocking = await countSubjectDependencies(subjectId);

  if (blocking.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Subject has ${blocking.map((entry) => `${entry.total} ${entry.label}`).join(', ')} and cannot be deleted.`,
    );
  }

  await pool.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);

  logger.info(`Subject ${subjectId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteSubjectHandler = (req, res, next) =>
  deleteSubject(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Subject is referenced by other records and cannot be deleted.',
      );
    }
    return next(error);
  });

module.exports = {
  createSubject: createSubjectHandler,
  listSubjects,
  getSubjectById,
  updateSubject: updateSubjectHandler,
  deleteSubject: deleteSubjectHandler,
};
