const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { toAmount } = require('../../utils/money');
const { validatePagination } = require('../../validations/student-validation');
const {
  validateCreateFee,
  validateUpdateFee,
  validateFeeSchedule,
  FEE_UPDATABLE_FIELDS,
} = require('../../validations/fee-validation');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const listFees = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const where = search ? 'WHERE fees.name LIKE ? OR fees.description LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.execute(
    `SELECT id, name, description, is_active, created_at, updated_at
     FROM fees ${where}
     ORDER BY fees.id
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM fees ${where}`, params);

  return sendOk(res, {
    fees: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

const getFeeById = async (req, res) => {
  const feeId = parseId(req.params.id);

  if (!feeId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee id.');
  }

  const [rows] = await pool.execute(
    'SELECT id, name, description, is_active, created_at, updated_at FROM fees WHERE id = ?',
    [feeId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee not found.');
  }

  return sendOk(res, rows[0]);
};

const createFee = async (req, res) => {
  const validationErrors = validateCreateFee(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const [result] = await pool.execute(
    'INSERT INTO fees (name, description) VALUES (?, ?)',
    [req.body.name.trim(), req.body.description ? String(req.body.description).trim() : null],
  );

  logger.info(`Fee ${result.insertId} created by admin ${req.user.userId}`);

  return sendCreated(res, { id: result.insertId, name: req.body.name.trim() });
};

const updateFee = async (req, res) => {
  const feeId = parseId(req.params.id);

  if (!feeId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee id.');
  }

  const validationErrors = validateUpdateFee(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const columns = [];
  const values = [];

  FEE_UPDATABLE_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
      return;
    }

    columns.push(`${field} = ?`);

    if (field === 'is_active') {
      values.push(req.body.is_active ? 1 : 0);
    } else {
      const value = req.body[field];
      values.push(value === '' || value === null ? null : String(value).trim());
    }
  });

  const [result] = await pool.execute(`UPDATE fees SET ${columns.join(', ')} WHERE id = ?`, [
    ...values,
    feeId,
  ]);

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee not found.');
  }

  return getFeeById(req, res);
};




const deleteFee = async (req, res) => {
  const feeId = parseId(req.params.id);

  if (!feeId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee id.');
  }

  const [[{ charged }]] = await pool.execute(
    'SELECT COUNT(*) AS charged FROM student_charges WHERE fee_id = ?',
    [feeId],
  );

  if (Number(charged) > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'This fee has already been charged to students. Mark it inactive instead of deleting it.',
    );
  }

  const [result] = await pool.execute('DELETE FROM fees WHERE id = ?', [feeId]);

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee not found.');
  }

  logger.info(`Fee ${feeId} deleted by admin ${req.user.userId}`);

  return sendOk(res, { id: feeId });
};

const SCHEDULE_SELECT = `
  fee_schedules.id,
  fee_schedules.academic_year_id,
  fee_schedules.grade_level_id,
  fee_schedules.fee_id,
  fee_schedules.amount,
  fees.name AS fee_name,
  grade_levels.name AS grade_level_name,
  academic_years.name AS academic_year_name
`;

const SCHEDULE_JOINS = `
  FROM fee_schedules
  JOIN fees ON fees.id = fee_schedules.fee_id
  JOIN grade_levels ON grade_levels.id = fee_schedules.grade_level_id
  JOIN academic_years ON academic_years.id = fee_schedules.academic_year_id
`;

const listFeeSchedules = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (req.query.academic_year_id) {
    conditions.push('fee_schedules.academic_year_id = ?');
    params.push(Number(req.query.academic_year_id));
  }

  if (req.query.grade_level_id) {
    conditions.push('fee_schedules.grade_level_id = ?');
    params.push(Number(req.query.grade_level_id));
  }

  if (search) {
    conditions.push('(fees.name LIKE ? OR grade_levels.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${SCHEDULE_SELECT} ${SCHEDULE_JOINS} ${where}
     ORDER BY academic_years.name DESC, grade_levels.level_number IS NULL,
              grade_levels.level_number, fees.id
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${SCHEDULE_JOINS} ${where}`,
    params,
  );

  return sendOk(res, {
    'fee-schedules': rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

const getFeeScheduleById = async (req, res) => {
  const scheduleId = parseId(req.params.id);

  if (!scheduleId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee schedule id.');
  }

  const [rows] = await pool.execute(
    `SELECT ${SCHEDULE_SELECT} ${SCHEDULE_JOINS} WHERE fee_schedules.id = ?`,
    [scheduleId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee schedule not found.');
  }

  return sendOk(res, { ...rows[0], amount: Number(rows[0].amount) });
};

const createFeeSchedule = async (req, res) => {
  const validationErrors = validateFeeSchedule(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const [result] = await pool.execute(
    `INSERT INTO fee_schedules (academic_year_id, grade_level_id, fee_id, amount)
     VALUES (?, ?, ?, ?)`,
    [
      Number(req.body.academic_year_id),
      Number(req.body.grade_level_id),
      Number(req.body.fee_id),
      toAmount(req.body.amount),
    ],
  );

  return sendCreated(res, { id: result.insertId });
};

const updateFeeSchedule = async (req, res) => {
  const scheduleId = parseId(req.params.id);

  if (!scheduleId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee schedule id.');
  }

  const validationErrors = validateFeeSchedule(req.body, { partial: true });

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const columns = [];
  const values = [];

  ['academic_year_id', 'grade_level_id', 'fee_id', 'amount'].forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
      return;
    }

    columns.push(`${field} = ?`);
    values.push(field === 'amount' ? toAmount(req.body[field]) : Number(req.body[field]));
  });

  if (columns.length === 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Nothing to update.');
  }

  const [result] = await pool.execute(
    `UPDATE fee_schedules SET ${columns.join(', ')} WHERE id = ?`,
    [...values, scheduleId],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee schedule not found.');
  }

  return getFeeScheduleById(req, res);
};

const deleteFeeSchedule = async (req, res) => {
  const scheduleId = parseId(req.params.id);

  if (!scheduleId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid fee schedule id.');
  }

  const [result] = await pool.execute('DELETE FROM fee_schedules WHERE id = ?', [scheduleId]);

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Fee schedule not found.');
  }

  return sendOk(res, { id: scheduleId });
};




const duplicateError = (handler, message) => (req, res, next) =>
  handler(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, message);
    }
    return next(error);
  });

module.exports = {
  listFees,
  getFeeById,
  createFee: duplicateError(createFee, 'A fee with this name already exists.'),
  updateFee: duplicateError(updateFee, 'A fee with this name already exists.'),
  deleteFee,
  listFeeSchedules,
  getFeeScheduleById,
  createFeeSchedule: duplicateError(
    createFeeSchedule,
    'That fee is already scheduled for this grade level and school year.',
  ),
  updateFeeSchedule: duplicateError(
    updateFeeSchedule,
    'That fee is already scheduled for this grade level and school year.',
  ),
  deleteFeeSchedule,
};
