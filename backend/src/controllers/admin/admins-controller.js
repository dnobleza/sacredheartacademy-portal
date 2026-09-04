const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateAdmin,
  validateUpdateAdmin,
  validatePagination,
  normalizePhone,
} = require('../../validations/admin-validation');
const { ACCESS_LEVELS } = require('../../utils/access-levels');

const ADMIN_ROLE_ID = 1;
const PASSWORD_LENGTH = 12;

const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

// Every query built on ADMIN_SELECT_FIELDS needs this join alongside the users
// join, since the level lives on users.
const ACCESS_LEVEL_JOIN = 'JOIN access_levels ON access_levels.id = users.access_level_id';

/**
 * Resolves an access level and confirms it belongs to the admin role. The
 * composite foreign key on users would reject a mismatch anyway, but catching
 * it here returns a 400 the form can show instead of a 500.
 */
const findAdminAccessLevel = async (accessLevelId) => {
  const [rows] = await pool.execute(
    'SELECT id FROM access_levels WHERE id = ? AND role_id = ?',
    [accessLevelId, ADMIN_ROLE_ID],
  );

  return rows[0] || null;
};

const ADMIN_SELECT_FIELDS = `
  admins.id,
  admins.user_id,
  admins.employee_number,
  admins.first_name,
  admins.last_name,
  admins.middle_name,
  admins.gender,
  admins.address,
  admins.contact_number,
  admins.created_at,
  admins.updated_at,
  users.email,
  users.status,
  users.access_level_id,
  access_levels.code AS access_level_code,
  access_levels.level AS access_level,
  access_levels.name AS access_level_name
`;

const createAdmin = async (req, res) => {
  const validationErrors = validateCreateAdmin(req.body);

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

  const accessLevelId = Number(req.body.access_level_id);
  const accessLevel = await findAdminAccessLevel(accessLevelId);

  if (!accessLevel) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Access level is not valid for an admin.');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const admin = await connection
    .execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, ?)`,
      [ADMIN_ROLE_ID, accessLevelId, email, passwordHash, 'active'],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO admins
            (user_id, employee_number, first_name, last_name, middle_name, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userResult.insertId,
            employeeNumber,
            firstName,
            lastName,
            middleName,
            gender,
            address,
            contactNumber,
          ],
        )
        .then(([adminResult]) => ({
          userId: userResult.insertId,
          adminId: adminResult.insertId,
        })),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  return sendCreated(res, {
    id: admin.adminId,
    user_id: admin.userId,
    email,
    employee_number: employeeNumber,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    gender,
    address,
    contact_number: contactNumber,
    status: 'active',
    access_level_id: accessLevelId,
    temporary_password: temporaryPassword,
  });
};

const createAdminHandler = (req, res, next) =>
  createAdmin(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email or employee number is already in use.');
    }
    return next(error);
  });

const listAdmins = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search
    ? `WHERE (
        admins.first_name LIKE ?
        OR admins.last_name LIKE ?
        OR admins.employee_number LIKE ?
        OR users.email LIKE ?
        OR CONCAT_WS(' ', admins.first_name, admins.middle_name, admins.last_name) LIKE ?
        OR CONCAT_WS(' ', admins.first_name, admins.last_name) LIKE ?
      )`
    : '';
  const searchParams = search ? Array(6).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM admins JOIN users ON users.id = admins.user_id ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${ADMIN_SELECT_FIELDS}
     FROM admins
     JOIN users ON users.id = admins.user_id
     ${ACCESS_LEVEL_JOIN}
     ${searchClause}
     ORDER BY admins.created_at DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    admins: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getAdminById = async (req, res) => {
  const adminId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${ADMIN_SELECT_FIELDS}
     FROM admins
     JOIN users ON users.id = admins.user_id
     ${ACCESS_LEVEL_JOIN}
     WHERE admins.id = ?`,
    [adminId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Admin not found.');
  }

  return sendOk(res, rows[0]);
};

const USER_UPDATE_FIELDS = ['email', 'status', 'access_level_id'];

const ADMIN_UPDATE_FIELDS = [
  'employee_number',
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

const updateAdmin = async (req, res) => {
  const validationErrors = validateUpdateAdmin(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const adminId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM admins WHERE id = ?', [
    adminId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Admin not found.');
  }

  const { user_id: userId } = existing[0];

  // The route lets any admin through so they can edit their own profile. Every
  // other admin's record is Super Admin territory, matching the level guard on
  // the rest of this router.
  if (userId !== req.user.userId && req.user.accessLevel !== ACCESS_LEVELS.SUPER_ADMIN) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Only a Super Admin can edit another admin account.',
    );
  }

  // Same reasoning as the self-deletion guard below: an admin setting their
  // own account inactive or suspended locks themselves out on the next token
  // refresh. The Profile page hides the field, but that is only the UI — the
  // rule has to hold for direct API calls too.
  if (
    userId === req.user.userId &&
    Object.prototype.hasOwnProperty.call(req.body, 'status') &&
    req.body.status !== 'active'
  ) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'You cannot deactivate your own account.');
  }

  // Same lockout reasoning: an admin demoting themselves loses whatever access
  // the new tier does not carry, with no way back.
  if (
    userId === req.user.userId &&
    Object.prototype.hasOwnProperty.call(req.body, 'access_level_id')
  ) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'You cannot change your own access level.');
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'access_level_id')) {
    const accessLevel = await findAdminAccessLevel(Number(req.body.access_level_id));

    if (!accessLevel) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Access level is not valid for an admin.');
    }
  }

  const userUpdate = buildAssignments(req.body, USER_UPDATE_FIELDS);
  const adminUpdate = buildAssignments(req.body, ADMIN_UPDATE_FIELDS);

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
      adminUpdate.clause
        ? connection.execute(`UPDATE admins SET ${adminUpdate.clause} WHERE id = ?`, [
            ...adminUpdate.values,
            adminId,
          ])
        : null,
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  const [rows] = await pool.execute(
    `SELECT ${ADMIN_SELECT_FIELDS}
     FROM admins
     JOIN users ON users.id = admins.user_id
     ${ACCESS_LEVEL_JOIN}
     WHERE admins.id = ?`,
    [adminId],
  );

  logger.info(`Admin ${adminId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateAdminHandler = (req, res, next) =>
  updateAdmin(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email or employee number is already in use.');
    }
    return next(error);
  });

const deleteAdmin = async (req, res) => {
  const adminId = req.params.id;

  const [existing] = await pool.execute('SELECT id, user_id FROM admins WHERE id = ?', [
    adminId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Admin not found.');
  }

  const { user_id: userId } = existing[0];

  // Diverges from the teachers mirror: an admin deleting their own account
  // would immediately invalidate the session they're using mid-request,
  // locking them out. Block self-deletion explicitly.
  if (userId === req.user.userId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'You cannot delete your own account.');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection
    .execute('DELETE FROM admins WHERE id = ?', [adminId])
    .then(() => connection.execute('DELETE FROM users WHERE id = ?', [userId]))
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(`Admin ${adminId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteAdminHandler = (req, res, next) =>
  deleteAdmin(req, res).catch((error) => {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Admin is referenced by other records and cannot be deleted.',
      );
    }
    return next(error);
  });

module.exports = {
  createAdmin: createAdminHandler,
  listAdmins,
  getAdminById,
  updateAdmin: updateAdminHandler,
  deleteAdmin: deleteAdminHandler,
};
