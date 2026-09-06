const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');
const { findImage } = require('../../utils/images');
const { normalizePhone } = require('../../validations/admin-validation');




const ROLE_PROFILE_TABLES = {
  admin: 'admins',
  teacher: 'teachers',
  student: 'students',
  parent: 'parents',
};

// What a person may change about themselves. Names, birth date, gender,
// student and employee numbers, email, status and access level are registrar
// records: renaming yourself would break class lists, receipts and the login
// identity, so they are managed by an administrator instead.
const SELF_UPDATE_FIELDS = ['contact_number', 'address', 'photo_id'];

const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;

const MAX_ADDRESS_LENGTH = 1000;




const validate = (body) => {
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(body, 'contact_number')) {
    const value = body.contact_number;

    if (value !== null && value !== '') {
      const phone = normalizePhone(value);

      if (!PHONE_REGEX.test(phone)) {
        errors.push('Contact number must be a valid mobile number, for example 09171234567.');
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'address')) {
    const value = body.address;

    if (value !== null && typeof value !== 'string') {
      errors.push('Address must be text.');
    } else if (typeof value === 'string' && value.trim().length > MAX_ADDRESS_LENGTH) {
      errors.push(`Address must be ${MAX_ADDRESS_LENGTH} characters or fewer.`);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'photo_id') && body.photo_id !== null) {
    const photoId = Number(body.photo_id);

    if (!Number.isInteger(photoId) || photoId < 1) {
      errors.push('Photo is not valid.');
    }
  }

  return errors;
};




const normalizeValue = (field, value) => {
  if (field === 'photo_id') {
    return value === undefined || value === null || value === '' ? null : Number(value);
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (field === 'contact_number') {
    return normalizePhone(value).trim();
  }

  return String(value).trim();
};




const readProfile = async (roleName, profileId) => {
  const tableName = ROLE_PROFILE_TABLES[roleName];

  if (!tableName) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT
       ${tableName}.*,
       users.email,
       users.status,
       access_levels.id AS access_level_id,
       access_levels.code AS access_level_code,
       access_levels.level AS access_level,
       access_levels.name AS access_level_name
     FROM ${tableName}
     JOIN users ON users.id = ${tableName}.user_id
     JOIN access_levels ON access_levels.id = users.access_level_id
     WHERE ${tableName}.id = ?`,
    [profileId],
  );

  if (rows.length === 0) {
    return null;
  }

  const {
    access_level_id: accessLevelId,
    access_level_code: accessLevelCode,
    access_level: accessLevel,
    access_level_name: accessLevelName,
    ...profile
  } = rows[0];

  return {
    profile,
    role: roleName,
    access_level: {
      id: accessLevelId,
      code: accessLevelCode,
      level: accessLevel,
      name: accessLevelName,
    },
  };
};




// Both handlers key on req.user.profileId, taken from the token. No id is read
// from the URL or the body, so there is no request shape that reaches somebody
// else's record.
const getMyProfile = async (req, res) => {
  const profileId = req.user.profileId;

  if (!profileId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No profile is linked to this account.');
  }

  const result = await readProfile(req.user.role, profileId);

  if (!result) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Profile not found.');
  }

  return sendOk(res, result);
};

const updateMyProfile = async (req, res) => {
  const profileId = req.user.profileId;
  const tableName = ROLE_PROFILE_TABLES[req.user.role];

  if (!profileId || !tableName) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No profile is linked to this account.');
  }

  const body = req.body || {};

  // Anything outside the whitelist is dropped rather than rejected: the form
  // may echo back the whole profile, and silently ignoring the read-only
  // fields is friendlier than refusing the save — but they never reach the
  // UPDATE.
  const provided = SELF_UPDATE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `At least one field is required: ${SELF_UPDATE_FIELDS.join(', ')}.`,
    );
  }

  const validationErrors = validate(body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  if (Object.prototype.hasOwnProperty.call(body, 'photo_id') && body.photo_id !== null) {
    const image = await findImage(body.photo_id);

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Photo is not valid.');
    }
  }

  const columns = provided.map((field) => `${field} = ?`);
  const values = provided.map((field) => normalizeValue(field, body[field]));

  const [result] = await pool.execute(
    `UPDATE ${tableName} SET ${columns.join(', ')} WHERE id = ?`,
    [...values, profileId],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Profile not found.');
  }

  logger.info(`User ${req.user.userId} updated their own profile (${provided.join(', ')})`);

  return sendOk(res, await readProfile(req.user.role, profileId));
};

module.exports = {
  SELF_UPDATE_FIELDS,
  getMyProfile,
  updateMyProfile,
};
