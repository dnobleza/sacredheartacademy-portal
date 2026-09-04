const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_VALUES = ['upcoming', 'active', 'completed'];

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isValidDateString = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateCreateAcademicYear = (payload) => {
  const errors = [];
  const {
    name,
    start_date: startDate,
    end_date: endDate,
    status,
  } = payload || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required.');
  } else if (name.trim().length > 20) {
    errors.push('Name must be 20 characters or fewer.');
  }

  if (!isProvided(startDate) || !isValidDateString(startDate)) {
    errors.push('A valid start date is required, in YYYY-MM-DD format.');
  }

  if (!isProvided(endDate) || !isValidDateString(endDate)) {
    errors.push('A valid end date is required, in YYYY-MM-DD format.');
  }

  if (isValidDateString(startDate) && isValidDateString(endDate) && endDate <= startDate) {
    errors.push('End date must be after start date.');
  }

  if (isProvided(status) && !STATUS_VALUES.includes(status)) {
    errors.push(`Status must be one of: ${STATUS_VALUES.join(', ')}.`);
  }

  return errors;
};

const UPDATABLE_FIELDS = ['name', 'start_date', 'end_date', 'status'];

const validateUpdateAcademicYear = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('name')) {
    if (!isProvided(body.name) || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('Name cannot be empty.');
    } else if (body.name.trim().length > 20) {
      errors.push('Name must be 20 characters or fewer.');
    }
  }

  if (provided.includes('start_date') && !isValidDateString(body.start_date)) {
    errors.push('A valid start date is required, in YYYY-MM-DD format.');
  }

  if (provided.includes('end_date') && !isValidDateString(body.end_date)) {
    errors.push('A valid end date is required, in YYYY-MM-DD format.');
  }

  // The full start/end comparison, including cases where only one of the two
  // is being changed, needs the existing row and is handled in the controller.
  if (
    provided.includes('start_date') &&
    provided.includes('end_date') &&
    isValidDateString(body.start_date) &&
    isValidDateString(body.end_date) &&
    body.end_date <= body.start_date
  ) {
    errors.push('End date must be after start date.');
  }

  if (provided.includes('status') && !STATUS_VALUES.includes(body.status)) {
    errors.push(`Status must be one of: ${STATUS_VALUES.join(', ')}.`);
  }

  return errors;
};

const validatePagination = (query) => {
  const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
  const rawLimit = Number.parseInt(query.limit, 10);
  const limit = rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;
  const search =
    typeof query.search === 'string' ? query.search.trim().replace(/\s+/g, ' ') : '';
  return { page, limit, search };
};

module.exports = {
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
  validatePagination,
  isValidDateString,
  STATUS_VALUES,
};
