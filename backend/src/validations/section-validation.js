const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isPositiveInteger = (value) => {
  const coerced = Number(value);
  return Number.isInteger(coerced) && coerced >= 1;
};

const validateCreateSection = (payload) => {
  const errors = [];
  const { name, grade_level_id: gradeLevelId, room } = payload || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required.');
  } else if (name.trim().length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  if (!isProvided(gradeLevelId) || !isPositiveInteger(gradeLevelId)) {
    errors.push('Grade level is required and must be a positive integer.');
  }

  if (isProvided(room) && (typeof room !== 'string' || room.length > 50)) {
    errors.push('Room must be 50 characters or fewer.');
  }

  return errors;
};

const UPDATABLE_FIELDS = ['name', 'grade_level_id', 'room'];

const validateUpdateSection = (payload) => {
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
    } else if (body.name.trim().length > 100) {
      errors.push('Name must be 100 characters or fewer.');
    }
  }

  if (provided.includes('grade_level_id') && (!isProvided(body.grade_level_id) || !isPositiveInteger(body.grade_level_id))) {
    errors.push('Grade level must be a positive integer.');
  }

  if (provided.includes('room') && isProvided(body.room) && (typeof body.room !== 'string' || body.room.length > 50)) {
    errors.push('Room must be 50 characters or fewer.');
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
  validateCreateSection,
  validateUpdateSection,
  validatePagination,
};
