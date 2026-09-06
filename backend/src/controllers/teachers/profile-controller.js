const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');
const { validateUpdateTeacher, normalizePhone } = require('../../validations/teacher-validation');



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


// Matches the shared self-service profile: a teacher changes their photo and
// how to reach them, not their name — that is a registrar record the class
// lists and grade sheets depend on.
const SELF_UPDATE_FIELDS = ['contact_number', 'address', 'photo_id'];

const findImage = async (imageId) => {
  const [rows] = await pool.execute('SELECT id FROM images WHERE id = ?', [imageId]);
  return rows[0] || null;
};

const normalizeUpdateValue = (field, value) => {
  if (field === 'photo_id') {
    return value === undefined || value === null ? null : Number(value);
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (field === 'contact_number') {
    return normalizePhone(value).trim();
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

const findTeacherById = async (teacherId) => {
  const [rows] = await pool.execute(
    `SELECT ${TEACHER_SELECT_FIELDS}
     FROM teachers
     JOIN users ON users.id = teachers.user_id
     WHERE teachers.id = ?`,
    [teacherId],
  );

  return rows[0] || null;
};

const getProfile = async (req, res) => {
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const teacher = await findTeacherById(teacherId);

  if (!teacher) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found.');
  }

  return sendOk(res, teacher);
};

const updateProfile = async (req, res) => {
  
  
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const body = req.body || {};
  const forbidden = ['email', 'status', 'employee_number', 'first_name', 'last_name', 'middle_name', 'gender'].filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (forbidden.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      `Only an administrator can change: ${forbidden.join(', ')}.`,
    );
  }

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

  
  
  const validationErrors = validateUpdateTeacher(body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const teacher = await findTeacherById(teacherId);

  if (!teacher) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found.');
  }

  
  
  if (Object.prototype.hasOwnProperty.call(body, 'photo_id') && body.photo_id !== null) {
    const image = await findImage(Number(body.photo_id));

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image is not valid.');
    }
  }

  const columns = provided.map((field) => `${field} = ?`);
  const values = provided.map((field) => normalizeUpdateValue(field, body[field]));

  await pool.execute(`UPDATE teachers SET ${columns.join(', ')} WHERE id = ?`, [
    ...values,
    teacherId,
  ]);

  logger.info(`Teacher ${teacherId} updated their own profile`);

  return sendOk(res, await findTeacherById(teacherId));
};

module.exports = {
  getProfile,
  updateProfile,
};
