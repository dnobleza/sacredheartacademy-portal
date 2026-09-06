const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');

const { validatePagination } = require('../../validations/student-validation');


const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const SELECT_FIELDS = `
  enrollment_downpayments.id,
  enrollment_downpayments.academic_year_id,
  enrollment_downpayments.grade_level_id,
  enrollment_downpayments.percentage,
  grade_levels.name AS grade_level_name,
  academic_years.name AS academic_year_name,
  COALESCE((
    SELECT SUM(fee_schedules.amount) FROM fee_schedules
    WHERE fee_schedules.grade_level_id = enrollment_downpayments.grade_level_id
      AND fee_schedules.academic_year_id = enrollment_downpayments.academic_year_id
  ), 0) AS total_charges
`;

const JOINS = `
  FROM enrollment_downpayments
  JOIN grade_levels ON grade_levels.id = enrollment_downpayments.grade_level_id
  JOIN academic_years ON academic_years.id = enrollment_downpayments.academic_year_id
`;




const isPositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1;
};




const validate = (payload, { partial = false } = {}) => {
  const errors = [];
  const body = payload || {};

  const requireId = (field, label) => {
    if (partial && !Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    if (!isPositiveInteger(body[field])) {
      errors.push(`${label} is required.`);
    }
  };

  requireId('academic_year_id', 'School year');
  requireId('grade_level_id', 'Grade level');

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'percentage')) {
    const percentage = Number(body.percentage);

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      errors.push('Downpayment percent must be between 0 and 100.');
    } else if (Math.round(percentage * 100) !== percentage * 100) {
      errors.push('Downpayment percent may have at most two decimals.');
    }
  }

  return errors;
};




const withComputed = (row) => {
  const percentage = Number(row.percentage);
  const totalCharges = Number(row.total_charges);

  return {
    ...row,
    percentage,
    total_charges: totalCharges,
    computed_amount: Math.round((totalCharges * percentage) / 100 * 100) / 100,
  };
};

const listDownpayments = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const where = search ? 'WHERE grade_levels.name LIKE ? OR academic_years.name LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.execute(
    `SELECT ${SELECT_FIELDS} ${JOINS} ${where}
     ORDER BY academic_years.name DESC, grade_levels.level_number IS NULL, grade_levels.level_number
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total ${JOINS} ${where}`, params);

  return sendOk(res, {
    downpayments: rows.map(withComputed),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

const getDownpaymentById = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid downpayment id.');
  }

  const [rows] = await pool.execute(`SELECT ${SELECT_FIELDS} ${JOINS} WHERE enrollment_downpayments.id = ?`, [id]);

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Downpayment not found.');
  }

  return sendOk(res, withComputed(rows[0]));
};

const createDownpayment = async (req, res) => {
  const validationErrors = validate(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const [result] = await pool.execute(
    'INSERT INTO enrollment_downpayments (academic_year_id, grade_level_id, percentage) VALUES (?, ?, ?)',
    [Number(req.body.academic_year_id), Number(req.body.grade_level_id), Number(req.body.percentage)],
  );

  return sendCreated(res, { id: result.insertId });
};

const updateDownpayment = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid downpayment id.');
  }

  const validationErrors = validate(req.body, { partial: true });

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const columns = [];
  const values = [];

  ['academic_year_id', 'grade_level_id', 'percentage'].forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
      return;
    }

    columns.push(`${field} = ?`);
    values.push(Number(req.body[field]));
  });

  if (columns.length === 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Nothing to update.');
  }

  const [result] = await pool.execute(
    `UPDATE enrollment_downpayments SET ${columns.join(', ')} WHERE id = ?`,
    [...values, id],
  );

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Downpayment not found.');
  }

  return getDownpaymentById(req, res);
};

const deleteDownpayment = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid downpayment id.');
  }

  const [result] = await pool.execute('DELETE FROM enrollment_downpayments WHERE id = ?', [id]);

  if (result.affectedRows === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Downpayment not found.');
  }

  return sendOk(res, { id });
};

const duplicateError = (handler) => (req, res, next) =>
  handler(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'That grade level already has a downpayment for this school year.',
      );
    }
    return next(error);
  });

module.exports = {
  listDownpayments,
  getDownpaymentById,
  createDownpayment: duplicateError(createDownpayment),
  updateDownpayment: duplicateError(updateDownpayment),
  deleteDownpayment,
};
