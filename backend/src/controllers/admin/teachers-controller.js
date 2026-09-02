const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const { validateCreateTeacher, validatePagination } = require('../../validations/teacher-validation');

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
  teachers.created_at,
  teachers.updated_at,
  users.email,
  users.status
`;

const createTeacher = async (req, res) => {
  const validationErrors = validateCreateTeacher(req.body);

  if (validationErrors.length > 0) {
    return res.status(400).json({ success: false, message: validationErrors.join(' ') });
  }

  const email = req.body.email.trim().toLowerCase();
  const employeeNumber = req.body.employee_number.trim();
  const firstName = req.body.first_name.trim();
  const lastName = req.body.last_name.trim();
  const middleName = req.body.middle_name ? req.body.middle_name.trim() : null;
  const gender = req.body.gender || null;
  const address = req.body.address || null;
  const contactNumber = req.body.contact_number ? req.body.contact_number.trim() : null;

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const teacher = await connection
    .execute('INSERT INTO users (role_id, email, password_hash, status) VALUES (?, ?, ?, ?)', [
      TEACHER_ROLE_ID,
      email,
      passwordHash,
      'active',
    ])
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO teachers
            (user_id, employee_number, first_name, last_name, middle_name, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userResult.insertId, employeeNumber, firstName, lastName, middleName, gender, address, contactNumber]
        )
        .then(([teacherResult]) => ({ userId: userResult.insertId, teacherId: teacherResult.insertId }))
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return res.status(201).json({
    success: true,
    data: {
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
      status: 'active',
      temporary_password: temporaryPassword,
    },
  });
};

const createTeacherHandler = (req, res, next) =>
  createTeacher(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Email or employee number is already in use.' });
    }
    return next(error);
  });

const listTeachers = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? 'WHERE teachers.first_name LIKE ? OR teachers.last_name LIKE ? OR teachers.employee_number LIKE ? OR users.email LIKE ?'
    : '';
  const searchParams = search ? Array(4).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM teachers JOIN users ON users.id = teachers.user_id ${searchClause}`,
    searchParams
  );

  const [rows] = await pool.query(
    `SELECT ${TEACHER_SELECT_FIELDS}
     FROM teachers
     JOIN users ON users.id = teachers.user_id
     ${searchClause}
     ORDER BY teachers.created_at DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset]
  );

  return res.status(200).json({
    success: true,
    data: {
      teachers: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit),
      },
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
    [teacherId]
  );

  if (rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }

  return res.status(200).json({ success: true, data: rows[0] });
};

module.exports = {
  createTeacher: createTeacherHandler,
  listTeachers,
  getTeacherById,
};
