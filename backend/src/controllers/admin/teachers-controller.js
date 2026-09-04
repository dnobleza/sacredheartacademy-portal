const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const { findSoleAccessLevelId } = require('../../utils/access-levels');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateTeacher,
  validateUpdateTeacher,
  validatePagination,
  normalizePhone,
} = require('../../validations/teacher-validation');

const TEACHER_ROLE_ID = 2;
const PASSWORD_LENGTH = 12;

const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

const TEACHER_SELECT_FIELDS = `
  teachers.id,
  teachers.user_id,
  teachers.employee_number,
  teachers.first_name,
  teachers.last_name,
  teachers.middle_name,
  teachers.gender,
  teachers.address,
  teachers.contact_number,
  teachers.photo_id,
  teachers.created_at,
  teachers.updated_at,
  users.email,
  users.status
`;

// Mirrors findGradeLevel in sections-controller.js: validate the foreign key
// up front so a bad photo_id is a 400, not a 500 from the FK constraint.
const findImage = async (imageId) => {
  const [rows] = await pool.execute('SELECT id FROM images WHERE id = ?', [imageId]);

  return rows[0] || null;
};

const createTeacher = async (req, res) => {
  const validationErrors = validateCreateTeacher(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const email = req.body.email.trim().toLowerCase();
  const employeeNumber = req.body.employee_number.trim();
  const firstName = req.body.first_name.trim();
  const lastName = req.body.last_name.trim();
  const middleName = req.body.middle_name ? req.body.middle_name.trim() : null;
  const gender = req.body.gender || null;
  const address = req.body.address || null;
  const contactNumber = req.body.contact_number
    ? normalizePhone(req.body.contact_number).trim()
    : null;
  const photoId = req.body.photo_id !== undefined && req.body.photo_id !== null
    ? Number(req.body.photo_id)
    : null;

  if (photoId !== null) {
    const image = await findImage(photoId);

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image is not valid.');
    }
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // users.access_level_id is NOT NULL. This role has exactly one access level,
  // so it is resolved rather than asked for: unlike admins, there is nothing to
  // choose. The helper throws if that ever stops being true.
  const accessLevelId = await findSoleAccessLevelId(TEACHER_ROLE_ID);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const teacher = await connection
    .execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?)`,
      [TEACHER_ROLE_ID, accessLevelId, email, passwordHash, 'active'],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO teachers
            (user_id, employee_number, first_name, last_name, middle_name, gender, address, contact_number, photo_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userResult.insertId,
            employeeNumber,
            firstName,
            lastName,
            middleName,
            gender,
            address,
            contactNumber,
            photoId,
          ],
        )
        .then(([teacherResult]) => ({
          userId: userResult.insertId,
          teacherId: teacherResult.insertId,
        })),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return sendCreated(res, {
    id: teacher.teacherId,
    user_id: teacher.userId,
    email,
    employee_number: employeeNumber,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    gender,
    address,
    contact_number: contactNumber,
    photo_id: photoId,
    status: 'active',
    temporary_password: temporaryPassword,
  });
};

const createTeacherHandler = (req, res, next) =>
  createTeacher(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email or employee number is already in use.');
    }
    return next(error);
  });

const listTeachers = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? `WHERE (
        teachers.first_name LIKE ?
        OR teachers.last_name LIKE ?
        OR teachers.employee_number LIKE ?
        OR users.email LIKE ?
        OR CONCAT_WS(' ', teachers.first_name, teachers.middle_name, teachers.last_name) LIKE ?
        OR CONCAT_WS(' ', teachers.first_name, teachers.last_name) LIKE ?
      )`
    : '';
  const searchParams = search ? Array(6).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM teachers JOIN users ON users.id = teachers.user_id ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${TEACHER_SELECT_FIELDS}
     FROM teachers
     JOIN users ON users.id = teachers.user_id
     ${searchClause}
     ORDER BY teachers.created_at DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    teachers: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getTeacherById = async (req, res) => {
  const teacherId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${TEACHER_SELECT_FIELDS}
     FROM teachers
     JOIN users ON users.id = teachers.user_id
     WHERE teachers.id = ?`,
    [teacherId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found.');
  }

  return sendOk(res, rows[0]);
};

const USER_UPDATE_FIELDS = ['email', 'status'];

const TEACHER_UPDATE_FIELDS = [
  'employee_number',
  'first_name',
  'last_name',
  'middle_name',
  'gender',
  'address',
  'contact_number',
  'photo_id',
];

const normalizeUpdateValue = (field, value) => {
  if (field === 'photo_id') {
    return value === undefined || value === null ? null : Number(value);
  }

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

const updateTeacher = async (req, res) => {
  const validationErrors = validateUpdateTeacher(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const teacherId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM teachers WHERE id = ?', [
    teacherId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found.');
  }

  // Explicit null clears the photo; any other provided value must resolve to
  // a real image row.
  if (Object.prototype.hasOwnProperty.call(req.body, 'photo_id') && req.body.photo_id !== null) {
    const image = await findImage(Number(req.body.photo_id));

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image is not valid.');
    }
  }

  const { user_id: userId } = existing[0];
  const userUpdate = buildAssignments(req.body, USER_UPDATE_FIELDS);
  const teacherUpdate = buildAssignments(req.body, TEACHER_UPDATE_FIELDS);

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
      teacherUpdate.clause
        ? connection.execute(`UPDATE teachers SET ${teacherUpdate.clause} WHERE id = ?`, [
            ...teacherUpdate.values,
            teacherId,
          ])
        : null,
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${TEACHER_SELECT_FIELDS}
     FROM teachers
     JOIN users ON users.id = teachers.user_id
     WHERE teachers.id = ?`,
    [teacherId],
  );

  logger.info(`Teacher ${teacherId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateTeacherHandler = (req, res, next) =>
  updateTeacher(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email or employee number is already in use.');
    }
    return next(error);
  });

const TEACHER_DEPENDENCIES = [
  { table: 'class_subjects', label: 'assigned classes' },
  { table: 'teacher_subjects', label: 'assigned subjects' },
];

const countTeacherDependencies = async (teacherId) => {
  const counts = await Promise.all(
    TEACHER_DEPENDENCIES.map(({ table, label }) =>
      pool
        .execute(`SELECT COUNT(*) AS total FROM ${table} WHERE teacher_id = ?`, [teacherId])
        .then(([rows]) => ({ label, total: rows[0].total })),
    ),
  );

  return counts.filter((entry) => entry.total > 0);
};

const deleteTeacher = async (req, res) => {
  const teacherId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM teachers WHERE id = ?', [
    teacherId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found.');
  }

  const blocking = await countTeacherDependencies(teacherId);

  if (blocking.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Teacher has ${blocking.map((entry) => `${entry.total} ${entry.label}`).join(', ')} and cannot be deleted. Set status to inactive instead.`,
    );
  }

  const { user_id: userId } = existing[0];

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection
    .execute('DELETE FROM teachers WHERE id = ?', [teacherId])
    .then(() => connection.execute('DELETE FROM users WHERE id = ?', [userId]))
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(`Teacher ${teacherId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteTeacherHandler = (req, res, next) =>
  deleteTeacher(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Teacher is referenced by other records and cannot be deleted. Set status to inactive instead.',
      );
    }
    return next(error);
  });

module.exports = {
  createTeacher: createTeacherHandler,
  listTeachers,
  getTeacherById,
  updateTeacher: updateTeacherHandler,
  deleteTeacher: deleteTeacherHandler,
};
