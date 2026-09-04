const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateSection,
  validateUpdateSection,
  validatePagination,
} = require('../../validations/section-validation');

const SECTION_SELECT_FIELDS = `
  sections.id,
  sections.grade_level_id,
  sections.name,
  sections.room,
  sections.created_at,
  sections.updated_at,
  grade_levels.name AS grade_level_name,
  grade_levels.level_number
`;

// Mirrors findAdminAccessLevel in admins-controller.js: validate the foreign
// key up front so a bad grade_level_id surfaces as a 400, not a 500 from the
// FK constraint.
const findGradeLevel = async (gradeLevelId) => {
  const [rows] = await pool.execute('SELECT id FROM grade_levels WHERE id = ?', [gradeLevelId]);

  return rows[0] || null;
};

const createSection = async (req, res) => {
  const validationErrors = validateCreateSection(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const name = req.body.name.trim();
  const gradeLevelId = Number(req.body.grade_level_id);
  const room = req.body.room !== undefined && req.body.room !== null && req.body.room !== ''
    ? req.body.room
    : null;

  const gradeLevel = await findGradeLevel(gradeLevelId);

  if (!gradeLevel) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Grade level is not valid.');
  }

  const [result] = await pool.execute(
    `INSERT INTO sections (grade_level_id, name, room) VALUES (?, ?, ?)`,
    [gradeLevelId, name, room],
  );

  return sendCreated(res, {
    id: result.insertId,
    grade_level_id: gradeLevelId,
    name,
    room,
  });
};

const createSectionHandler = (req, res, next) =>
  createSection(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'A section with this name already exists for that grade level.',
      );
    }
    return next(error);
  });

const listSections = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? 'WHERE sections.name LIKE ? OR sections.room LIKE ? OR grade_levels.name LIKE ?'
    : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${SECTION_SELECT_FIELDS}
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     ${searchClause}
     ORDER BY grade_levels.level_number ASC, sections.name ASC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    sections: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getSectionById = async (req, res) => {
  const sectionId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${SECTION_SELECT_FIELDS}
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE sections.id = ?`,
    [sectionId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
  }

  return sendOk(res, rows[0]);
};

const UPDATE_FIELDS = ['name', 'grade_level_id', 'room'];

const normalizeUpdateValue = (field, value) => {
  if (field === 'name' && typeof value === 'string') {
    return value.trim();
  }
  if (field === 'grade_level_id') {
    return Number(value);
  }
  if (field === 'room') {
    return value === undefined || value === null || value === '' ? null : value;
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

const updateSection = async (req, res) => {
  const validationErrors = validateUpdateSection(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const sectionId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM sections WHERE id = ?', [sectionId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'grade_level_id')) {
    const gradeLevel = await findGradeLevel(Number(req.body.grade_level_id));

    if (!gradeLevel) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Grade level is not valid.');
    }
  }

  const update = buildAssignments(req.body, UPDATE_FIELDS);

  await pool.execute(`UPDATE sections SET ${update.clause} WHERE id = ?`, [
    ...update.values,
    sectionId,
  ]);

  const [rows] = await pool.execute(
    `SELECT ${SECTION_SELECT_FIELDS}
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE sections.id = ?`,
    [sectionId],
  );

  logger.info(`Section ${sectionId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateSectionHandler = (req, res, next) =>
  updateSection(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'A section with this name already exists for that grade level.',
      );
    }
    return next(error);
  });

const SECTION_DEPENDENCIES = [
  { table: 'enrollments', label: 'enrollments' },
  { table: 'class_subjects', label: 'class subjects' },
];

const countSectionDependencies = async (sectionId) => {
  const counts = await Promise.all(
    SECTION_DEPENDENCIES.map(({ table, label }) =>
      pool
        .execute(`SELECT COUNT(*) AS total FROM ${table} WHERE section_id = ?`, [sectionId])
        .then(([rows]) => ({ label, total: rows[0].total })),
    ),
  );

  return counts.filter((entry) => entry.total > 0);
};

const deleteSection = async (req, res) => {
  const sectionId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM sections WHERE id = ?', [sectionId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
  }

  const blocking = await countSectionDependencies(sectionId);

  if (blocking.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Section has ${blocking.map((entry) => `${entry.total} ${entry.label}`).join(', ')} and cannot be deleted.`,
    );
  }

  await pool.execute('DELETE FROM sections WHERE id = ?', [sectionId]);

  logger.info(`Section ${sectionId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteSectionHandler = (req, res, next) =>
  deleteSection(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Section is referenced by other records and cannot be deleted.',
      );
    }
    return next(error);
  });

module.exports = {
  createSection: createSectionHandler,
  listSections,
  getSectionById,
  updateSection: updateSectionHandler,
  deleteSection: deleteSectionHandler,
};
