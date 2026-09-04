const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isPositiveInteger = (value) => {
  const coerced = Number(value);
  return Number.isInteger(coerced) && coerced >= 1;
};

const validateCreateGradeLevel = (payload) => {
  const errors = [];
  const { name, level_number: levelNumber } = payload || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required.');
  } else if (name.trim().length > 50) {
    errors.push('Name must be 50 characters or fewer.');
  }

  if (isProvided(levelNumber) && !isPositiveInteger(levelNumber)) {
    errors.push('Level number must be a positive integer.');
  }

  return errors;
};

const UPDATABLE_FIELDS = ['name', 'level_number'];

const validateUpdateGradeLevel = (payload) => {
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
    } else if (body.name.trim().length > 50) {
      errors.push('Name must be 50 characters or fewer.');
    }
  }

  if (provided.includes('level_number') && isProvided(body.level_number) && !isPositiveInteger(body.level_number)) {
    errors.push('Level number must be a positive integer.');
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
  validateCreateGradeLevel,
  validateUpdateGradeLevel,
  validatePagination,
};
