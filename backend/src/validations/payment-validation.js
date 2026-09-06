const { isValidAmount, toAmount, sumAmounts } = require('../utils/money');

const PAYMENT_METHODS = ['cash', 'gcash', 'bank_transfer', 'card', 'other'];




const PAYMENT_TYPES = ['full', 'partial'];

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isPositiveInteger = (value) => {
  const coerced = Number(value);
  return Number.isInteger(coerced) && coerced >= 1;
};




const validateCreatePayment = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!isPositiveInteger(body.student_id)) {
    errors.push('A student must be selected.');
  }

  if (!isValidAmount(body.amount)) {
    errors.push('Payment amount must be greater than zero, with at most two decimals.');
  }

  if (!PAYMENT_METHODS.includes(body.method)) {
    errors.push(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`);
  }



  if (isProvided(body.payment_type) && !PAYMENT_TYPES.includes(body.payment_type)) {
    errors.push(`Payment type must be one of: ${PAYMENT_TYPES.join(', ')}.`);
  }

  if (isProvided(body.reference_no) && String(body.reference_no).trim().length > 50) {
    errors.push('Reference number must be 50 characters or fewer.');
  }

  if (isProvided(body.notes) && String(body.notes).trim().length > 255) {
    errors.push('Notes must be 255 characters or fewer.');
  }

  const allocations = Array.isArray(body.allocations) ? body.allocations : [];

  if (allocations.length === 0) {
    errors.push('Choose at least one fee to apply this payment to.');
    return errors;
  }

  const seen = new Set();

  allocations.forEach((allocation) => {
    const entry = allocation || {};

    if (!isPositiveInteger(entry.fee_id)) {
      errors.push('Each allocation needs a valid fee.');
      return;
    }

    if (seen.has(Number(entry.fee_id))) {
      errors.push('The same fee was allocated twice.');
      return;
    }

    seen.add(Number(entry.fee_id));

    if (!isValidAmount(entry.amount)) {
      errors.push('Each allocation must be greater than zero.');
    }
  });



  if (errors.length === 0 && sumAmounts(allocations.map((a) => a.amount)) !== toAmount(body.amount)) {
    errors.push('The amounts applied to fees must add up to the payment amount.');
  }

  return errors;
};

const validateOpenSession = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!isValidAmount(body.opening_cash, { allowZero: true })) {
    errors.push('Opening cash must be zero or more.');
  }

  return errors;
};

const validateCloseSession = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!isValidAmount(body.closing_cash, { allowZero: true })) {
    errors.push('Counted cash must be zero or more.');
  }

  if (isProvided(body.notes) && String(body.notes).trim().length > 255) {
    errors.push('Notes must be 255 characters or fewer.');
  }

  return errors;
};

module.exports = {
  validateCreatePayment,
  validateOpenSession,
  validateCloseSession,
  PAYMENT_METHODS,
  PAYMENT_TYPES,
};
