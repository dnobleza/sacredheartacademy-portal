const { isValidAmount } = require('../utils/money');

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isPositiveInteger = (value) => {
  const coerced = Number(value);
  return Number.isInteger(coerced) && coerced >= 1;
};

const validateCreateFee = (payload) => {
  const errors = [];
  const { name, description } = payload || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required.');
  } else if (name.trim().length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  if (isProvided(description) && (typeof description !== 'string' || description.length > 255)) {
    errors.push('Description must be 255 characters or fewer.');
  }

  return errors;
};

const FEE_UPDATABLE_FIELDS = ['name', 'description', 'is_active'];

const validateUpdateFee = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = FEE_UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${FEE_UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('name')) {
    if (!isProvided(body.name) || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('Name cannot be empty.');
    } else if (body.name.trim().length > 100) {
      errors.push('Name must be 100 characters or fewer.');
    }
  }

  if (
    provided.includes('description')
    && isProvided(body.description)
    && (typeof body.description !== 'string' || body.description.length > 255)
  ) {
    errors.push('Description must be 255 characters or fewer.');
  }

  return errors;
};




const validateFeeSchedule = (payload, { partial = false } = {}) => {
  const errors = [];
  const body = payload || {};

  const requireField = (field, label) => {
    if (partial && !Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    if (!isPositiveInteger(body[field])) {
      errors.push(`${label} is required.`);
    }
  };

  requireField('academic_year_id', 'School year');
  requireField('grade_level_id', 'Grade level');
  requireField('fee_id', 'Fee');

  if (!partial || Object.prototype.hasOwnProperty.call(body, 'amount')) {


    if (!isValidAmount(body.amount, { allowZero: true })) {
      errors.push('Amount must be a number of 0 or more, with at most two decimals.');
    }
  }

  return errors;
};

module.exports = {
  validateCreateFee,
  validateUpdateFee,
  validateFeeSchedule,
  FEE_UPDATABLE_FIELDS,
};
