const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const { findSoleAccessLevelId } = require('../../utils/access-levels');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateParent,
  validateUpdateParent,
  validateLinkChild,
  validatePagination,
  normalizePhone,
} = require('../../validations/parent-validation');

const PARENT_ROLE_ID = 4;
const PASSWORD_LENGTH = 12;

const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

const PARENT_SELECT_FIELDS = `
  parents.id,
  parents.user_id,
  parents.first_name,
  parents.last_name,
  parents.middle_name,
  parents.gender,
  parents.address,
  parents.contact_number,
  parents.created_at,
  parents.updated_at,
  users.email,
  users.status
`;

const createParent = async (req, res) => {
  const validationErrors = validateCreateParent(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const email = req.body.email.trim().toLowerCase();
  const firstName = req.body.first_name.trim();
  const lastName = req.body.last_name.trim();
  const middleName = req.body.middle_name ? req.body.middle_name.trim() : null;
  const gender = req.body.gender || null;
  const address = req.body.address || null;
  const contactNumber = req.body.contact_number
    ? normalizePhone(req.body.contact_number).trim()
    : null;

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // users.access_level_id is NOT NULL. This role has exactly one access level,
  // so it is resolved rather than asked for: unlike admins, there is nothing to
  // choose. The helper throws if that ever stops being true.
  const accessLevelId = await findSoleAccessLevelId(PARENT_ROLE_ID);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const parent = await connection
    .execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?)`,
      [PARENT_ROLE_ID, accessLevelId, email, passwordHash, 'active'],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO parents
            (user_id, first_name, last_name, middle_name, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userResult.insertId, firstName, lastName, middleName, gender, address, contactNumber],
        )
        .then(([parentResult]) => ({
          userId: userResult.insertId,
          parentId: parentResult.insertId,
        })),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return sendCreated(res, {
    id: parent.parentId,
    user_id: parent.userId,
    email,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    gender,
    address,
    contact_number: contactNumber,
    status: 'active',
    temporary_password: temporaryPassword,
  });
};

const createParentHandler = (req, res, next) =>
  createParent(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const listParents = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? `WHERE (
        parents.first_name LIKE ?
        OR parents.last_name LIKE ?
        OR users.email LIKE ?
        OR CONCAT_WS(' ', parents.first_name, parents.middle_name, parents.last_name) LIKE ?
        OR CONCAT_WS(' ', parents.first_name, parents.last_name) LIKE ?
      )`
    : '';
  const searchParams = search ? Array(5).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM parents JOIN users ON users.id = parents.user_id ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${PARENT_SELECT_FIELDS}
     FROM parents
     JOIN users ON users.id = parents.user_id
     ${searchClause}
     ORDER BY parents.created_at DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    parents: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const CHILD_SELECT_FIELDS = `
  students.id,
  students.first_name,
  students.last_name,
  students.middle_name,
  student_parents.relationship,
  student_parents.is_primary_contact
`;

const findChildrenByParentId = (parentId) =>
  pool
    .execute(
      `SELECT ${CHILD_SELECT_FIELDS}
       FROM student_parents
       JOIN students ON students.id = student_parents.student_id
       WHERE student_parents.parent_id = ?
       ORDER BY students.last_name, students.first_name`,
      [parentId],
    )
    .then(([rows]) => rows);

const getParentById = async (req, res) => {
  const parentId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${PARENT_SELECT_FIELDS}
     FROM parents
     JOIN users ON users.id = parents.user_id
     WHERE parents.id = ?`,
    [parentId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Parent not found.');
  }

  // A parent may guard several students, so the children come with the profile.
  const children = await findChildrenByParentId(parentId);

  return sendOk(res, { ...rows[0], children });
};

const USER_UPDATE_FIELDS = ['email', 'status'];

const PARENT_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'gender',
  'address',
  'contact_number',
];

const normalizeUpdateValue = (field, value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (field === 'email') {
    return value.trim().toLowerCase();
  }

  if (field === 'contact_number') {
    return normalizePhone(value).trim();
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

const updateParent = async (req, res) => {
  const validationErrors = validateUpdateParent(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const parentId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM parents WHERE id = ?', [parentId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Parent not found.');
  }

  const { user_id: userId } = existing[0];
  const userUpdate = buildAssignments(req.body, USER_UPDATE_FIELDS);
  const parentUpdate = buildAssignments(req.body, PARENT_UPDATE_FIELDS);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await Promise.resolve()
    .then(() =>
      userUpdate.clause
        ? connection.execute(`UPDATE users SET ${userUpdate.clause} WHERE id = ?`, [
            ...userUpdate.values,
            userId,
          ])
        : null,
    )
    .then(() =>
      parentUpdate.clause
        ? connection.execute(`UPDATE parents SET ${parentUpdate.clause} WHERE id = ?`, [
            ...parentUpdate.values,
            parentId,
          ])
        : null,
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${PARENT_SELECT_FIELDS}
     FROM parents
     JOIN users ON users.id = parents.user_id
     WHERE parents.id = ?`,
    [parentId],
  );

  logger.info(`Parent ${parentId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateParentHandler = (req, res, next) =>
  updateParent(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const deleteParent = async (req, res) => {
  const parentId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM parents WHERE id = ?', [parentId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Parent not found.');
  }

  // student_parents cascades, so a delete would silently drop the links.
  // Refuse instead and make the admin unlink the children deliberately.
  const [links] = await pool.execute(
    'SELECT COUNT(*) AS total FROM student_parents WHERE parent_id = ?',
    [parentId],
  );

  if (links[0].total > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Parent is still linked to ${links[0].total} student(s) and cannot be deleted. Unlink the children first, or set status to inactive instead.`,
    );
  }

  const { user_id: userId } = existing[0];

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection
    .execute('DELETE FROM parents WHERE id = ?', [parentId])
    .then(() => connection.execute('DELETE FROM users WHERE id = ?', [userId]))
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(`Parent ${parentId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteParentHandler = (req, res, next) =>
  deleteParent(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Parent is referenced by other records and cannot be deleted. Set status to inactive instead.',
      );
    }
    return next(error);
  });

const listChildren = async (req, res) => {
  const parentId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM parents WHERE id = ?', [parentId]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Parent not found.');
  }

  return sendOk(res, { children: await findChildrenByParentId(parentId) });
};

const linkChild = async (req, res) => {
  const validationErrors = validateLinkChild(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const parentId = req.params.id;
  const studentId = Number(req.body.student_id);
  const relationship = req.body.relationship || 'guardian';
  const isPrimaryContact = req.body.is_primary_contact === true ? 1 : 0;

  const [parentRows] = await pool.execute('SELECT id FROM parents WHERE id = ?', [parentId]);

  if (parentRows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Parent not found.');
  }

  const [studentRows] = await pool.execute('SELECT id FROM students WHERE id = ?', [studentId]);

  if (studentRows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  const [result] = await pool.execute(
    `INSERT INTO student_parents (student_id, parent_id, relationship, is_primary_contact)
     VALUES (?, ?, ?, ?)`,
    [studentId, parentId, relationship, isPrimaryContact],
  );

  logger.info(`Student ${studentId} linked to parent ${parentId} by admin ${req.user.userId}`);

  return sendCreated(res, {
    id: result.insertId,
    student_id: studentId,
    parent_id: Number(parentId),
    relationship,
    is_primary_contact: isPrimaryContact === 1,
  });
};

const linkChildHandler = (req, res, next) =>
  linkChild(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'This student is already linked to this parent.');
    }
    return next(error);
  });

const unlinkChild = async (req, res) => {
  const { id: parentId, studentId } = req.params;

  const [result] = await pool.execute(
    'DELETE FROM student_parents WHERE parent_id = ? AND student_id = ?',
    [parentId, studentId],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'This student is not linked to this parent.');
  }

  logger.info(`Student ${studentId} unlinked from parent ${parentId} by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

module.exports = {
  createParent: createParentHandler,
  listParents,
  getParentById,
  updateParent: updateParentHandler,
  deleteParent: deleteParentHandler,
  listChildren,
  linkChild: linkChildHandler,
  unlinkChild,
};
