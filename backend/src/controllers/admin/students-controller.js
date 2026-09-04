const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateStudent,
  validateUpdateStudent,
  validatePagination,
  normalizePhone,
} = require('../../validations/student-validation');

const STUDENT_ROLE_ID = 3;
const PASSWORD_LENGTH = 12;

const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

const STUDENT_SELECT_FIELDS = `
  students.id,
  students.user_id,
  students.first_name,
  students.last_name,
  students.middle_name,
  students.birth_date,
  students.gender,
  students.address,
  students.contact_number,
  students.created_at,
  students.updated_at,
  users.email,
  users.status
`;

const createStudent = async (req, res) => {
  const validationErrors = validateCreateStudent(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const email = req.body.email.trim().toLowerCase();
  const firstName = req.body.first_name.trim();
  const lastName = req.body.last_name.trim();
  const middleName = req.body.middle_name ? req.body.middle_name.trim() : null;
  const birthDate = req.body.birth_date ? req.body.birth_date.trim() : null;
  const gender = req.body.gender || null;
  const address = req.body.address || null;
  const contactNumber = req.body.contact_number
    ? normalizePhone(req.body.contact_number).trim()
    : null;

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const student = await connection
    .execute(
      // users.access_level_id is NOT NULL. This role has exactly one access
      // level, so it is resolved here rather than asked for: unlike admins,
      // there is nothing to choose.
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, (SELECT id FROM access_levels WHERE role_id = ?), ?, ?, ?)`,
      [STUDENT_ROLE_ID, STUDENT_ROLE_ID, email, passwordHash, 'active'],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO students
            (user_id, first_name, last_name, middle_name, birth_date, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userResult.insertId,
            firstName,
            lastName,
            middleName,
            birthDate,
            gender,
            address,
            contactNumber,
          ],
        )
        .then(([studentResult]) => ({
          userId: userResult.insertId,
          studentId: studentResult.insertId,
        })),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return sendCreated(res, {
    id: student.studentId,
    user_id: student.userId,
    email,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    birth_date: birthDate,
    gender,
    address,
    contact_number: contactNumber,
    status: 'active',
    temporary_password: temporaryPassword,
  });
};

const createStudentHandler = (req, res, next) =>
  createStudent(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const listStudents = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? `WHERE (
        students.first_name LIKE ?
        OR students.last_name LIKE ?
        OR users.email LIKE ?
        OR CONCAT_WS(' ', students.first_name, students.middle_name, students.last_name) LIKE ?
        OR CONCAT_WS(' ', students.first_name, students.last_name) LIKE ?
      )`
    : '';
  const searchParams = search ? Array(5).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM students JOIN users ON users.id = students.user_id ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${STUDENT_SELECT_FIELDS}
     FROM students
     JOIN users ON users.id = students.user_id
     ${searchClause}
     ORDER BY students.created_at DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    students: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getStudentById = async (req, res) => {
  const studentId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${STUDENT_SELECT_FIELDS}
     FROM students
     JOIN users ON users.id = students.user_id
     WHERE students.id = ?`,
    [studentId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  return sendOk(res, rows[0]);
};

const USER_UPDATE_FIELDS = ['email', 'status'];

const STUDENT_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'middle_name',
  'birth_date',
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

const updateStudent = async (req, res) => {
  const validationErrors = validateUpdateStudent(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const studentId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM students WHERE id = ?', [
    studentId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  const { user_id: userId } = existing[0];
  const userUpdate = buildAssignments(req.body, USER_UPDATE_FIELDS);
  const studentUpdate = buildAssignments(req.body, STUDENT_UPDATE_FIELDS);

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
      studentUpdate.clause
        ? connection.execute(`UPDATE students SET ${studentUpdate.clause} WHERE id = ?`, [
            ...studentUpdate.values,
            studentId,
          ])
        : null,
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${STUDENT_SELECT_FIELDS}
     FROM students
     JOIN users ON users.id = students.user_id
     WHERE students.id = ?`,
    [studentId],
  );

  logger.info(`Student ${studentId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateStudentHandler = (req, res, next) =>
  updateStudent(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const STUDENT_DEPENDENCIES = [
  { table: 'attendance', label: 'attendance records' },
  { table: 'enrollments', label: 'enrollments' },
  { table: 'grades', label: 'grades' },
  { table: 'submissions', label: 'submissions' },
];

const countStudentDependencies = async (studentId) => {
  const counts = await Promise.all(
    STUDENT_DEPENDENCIES.map(({ table, label }) =>
      pool
        .execute(`SELECT COUNT(*) AS total FROM ${table} WHERE student_id = ?`, [studentId])
        .then(([rows]) => ({ label, total: rows[0].total })),
    ),
  );

  return counts.filter((entry) => entry.total > 0);
};

const deleteStudent = async (req, res) => {
  const studentId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM students WHERE id = ?', [
    studentId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  const blocking = await countStudentDependencies(studentId);

  if (blocking.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `Student has ${blocking.map((entry) => `${entry.total} ${entry.label}`).join(', ')} and cannot be deleted. Set status to inactive instead.`,
    );
  }

  const { user_id: userId } = existing[0];

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection
    .execute('DELETE FROM students WHERE id = ?', [studentId])
    .then(() => connection.execute('DELETE FROM users WHERE id = ?', [userId]))
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(`Student ${studentId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteStudentHandler = (req, res, next) =>
  deleteStudent(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Student is referenced by other records and cannot be deleted. Set status to inactive instead.',
      );
    }
    return next(error);
  });

module.exports = {
  createStudent: createStudentHandler,
  listStudents,
  getStudentById,
  updateStudent: updateStudentHandler,
  deleteStudent: deleteStudentHandler,
};
