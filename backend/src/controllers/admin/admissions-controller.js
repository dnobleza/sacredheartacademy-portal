const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { findSoleAccessLevelId } = require('../../utils/access-levels');
const { validateReviewStatus } = require('../../validations/admission-validation');
const { validatePagination } = require('../../validations/student-validation');

const STUDENT_ROLE_ID = 3;
const PASSWORD_LENGTH = 12;

const STATUS_VALUES = ['pending', 'reviewing', 'accepted', 'rejected', 'enrolled'];

// Mirrors generateTemporaryPassword in students-controller.js.
const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

const APPLICATION_SELECT_FIELDS = `
  admission_applications.id,
  admission_applications.reference_number,
  admission_applications.first_name,
  admission_applications.middle_name,
  admission_applications.last_name,
  admission_applications.birth_date,
  admission_applications.gender,
  admission_applications.address,
  admission_applications.email,
  admission_applications.contact_number,
  admission_applications.guardian_name,
  admission_applications.guardian_relationship,
  admission_applications.guardian_contact_number,
  admission_applications.guardian_email,
  admission_applications.previous_school,
  admission_applications.notes,
  admission_applications.status,
  admission_applications.review_remarks,
  admission_applications.reviewed_at,
  admission_applications.student_id,
  admission_applications.created_at,
  grade_levels.name AS grade_level_name,
  academic_years.name AS academic_year_name,
  COALESCE(
    NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
    reviewer.email
  ) AS reviewed_by_name
`;

const APPLICATION_JOINS = `
  FROM admission_applications
  JOIN grade_levels ON grade_levels.id = admission_applications.grade_level_id
  LEFT JOIN academic_years ON academic_years.id = admission_applications.academic_year_id
  LEFT JOIN users AS reviewer ON reviewer.id = admission_applications.reviewed_by
  LEFT JOIN admins ON admins.user_id = reviewer.id
`;

const findApplication = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT ${APPLICATION_SELECT_FIELDS} ${APPLICATION_JOINS}
     WHERE admission_applications.id = ?`,
    [applicationId],
  );

  return rows[0] || null;
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const listApplications = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  // An unknown status would silently return everything, so it is refused.
  if (req.query.status) {
    if (!STATUS_VALUES.includes(req.query.status)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `Status must be one of: ${STATUS_VALUES.join(', ')}.`);
    }

    conditions.push('admission_applications.status = ?');
    params.push(req.query.status);
  }

  if (search) {
    conditions.push(`(
      admission_applications.first_name LIKE ?
      OR admission_applications.last_name LIKE ?
      OR admission_applications.reference_number LIKE ?
      OR admission_applications.email LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${APPLICATION_SELECT_FIELDS}
     ${APPLICATION_JOINS}
     ${whereClause}
     ORDER BY admission_applications.created_at DESC, admission_applications.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${APPLICATION_JOINS} ${whereClause}`,
    params,
  );

  return sendOk(res, {
    admissions: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

const getApplicationById = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  return sendOk(res, application);
};

/**
 * Moves an application to 'reviewing' or 'rejected'. 'accepted' is not
 * reachable here: accepting creates a student account, so it goes through
 * acceptApplication and its transaction.
 */
const updateStatus = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const validationErrors = validateReviewStatus(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  // An accepted application already has a student account behind it; reopening
  // it would leave that account orphaned from the record that explains it.
  if (application.status === 'accepted' || application.status === 'enrolled') {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'This application has already been accepted and cannot be changed.',
    );
  }

  const remarks = req.body.review_remarks ? String(req.body.review_remarks).trim() : null;

  await pool.execute(
    `UPDATE admission_applications
     SET status = ?, review_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [req.body.status, remarks, req.user.userId, applicationId],
  );

  logger.info(
    `Admission ${application.reference_number} set to ${req.body.status} by admin ${req.user.userId}`,
  );

  return sendOk(res, await findApplication(applicationId));
};

/**
 * Accepting converts the application into a real account: one users row and one
 * students row, written in a single transaction alongside the status change, so
 * a failure part-way cannot leave a login with no profile or an application
 * that claims a student who does not exist.
 *
 * The temporary password is returned once and never stored in the clear, the
 * same contract the Students screen already has.
 */
const acceptApplication = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  // Guards a double click: a second accept must not create a second account.
  if (application.status === 'accepted' || application.status === 'enrolled') {
    return sendError(res, HTTP_STATUS.CONFLICT, 'This application has already been accepted.');
  }

  const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [
    application.email,
  ]);

  if (existingUser.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'An account already uses this email address. Update the application email or link the existing student manually.',
    );
  }

  const accessLevelId = await findSoleAccessLevelId(STUDENT_ROLE_ID);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const created = await connection
    .execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [STUDENT_ROLE_ID, accessLevelId, application.email, passwordHash],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO students
            (user_id, first_name, last_name, middle_name, birth_date, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userResult.insertId,
            application.first_name,
            application.last_name,
            application.middle_name,
            application.birth_date,
            application.gender,
            application.address,
            application.contact_number,
          ],
        )
        .then(([studentResult]) => ({
          userId: userResult.insertId,
          studentId: studentResult.insertId,
        })),
    )
    .then((ids) =>
      connection
        .execute(
          `UPDATE admission_applications
           SET status = 'accepted', student_id = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
               review_remarks = COALESCE(?, review_remarks)
           WHERE id = ?`,
          [
            ids.studentId,
            req.user.userId,
            req.body && req.body.review_remarks ? String(req.body.review_remarks).trim() : null,
            applicationId,
          ],
        )
        .then(() => ids),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(
    `Admission ${application.reference_number} accepted by admin ${req.user.userId}; student ${created.studentId} created`,
  );

  return sendOk(res, {
    application: await findApplication(applicationId),
    student: {
      id: created.studentId,
      user_id: created.userId,
      email: application.email,
      temporary_password: temporaryPassword,
    },
  });
};

const acceptApplicationHandler = (req, res, next) =>
  acceptApplication(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const deleteApplication = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  await pool.execute('DELETE FROM admission_applications WHERE id = ?', [applicationId]);

  logger.info(
    `Admission ${application.reference_number} deleted by admin ${req.user.userId}`,
  );

  return sendOk(res, { id: applicationId, deleted: true });
};

module.exports = {
  listApplications,
  getApplicationById,
  updateStatus,
  acceptApplication: acceptApplicationHandler,
  deleteApplication,
};
