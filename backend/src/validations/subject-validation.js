const isProvided = (value) => value !== undefined && value !== null && value !== '';

const validateCode = (code, errors, { required }) => {
  if (!isProvided(code)) {
    if (required) {
      errors.push('Code is required.');
    } else {
      errors.push('Code cannot be empty.');
    }
    return;
  }

  if (typeof code !== 'string' || !code.trim()) {
    errors.push(required ? 'Code is required.' : 'Code cannot be empty.');
  } else if (code.trim().length > 30) {
    errors.push('Code must be 30 characters or fewer.');
  }
};

const validateName = (name, errors, { required }) => {
  if (!isProvided(name) || typeof name !== 'string' || !name.trim()) {
    errors.push(required ? 'Name is required.' : 'Name cannot be empty.');
  } else if (name.trim().length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }
};

// description is a text column, so the database imposes no practical limit.
// Cap it here to keep a runaway paste out of the row.
const validateDescription = (description, errors) => {
  if (!isProvided(description)) {
    return;
  }

  if (typeof description !== 'string' || description.length > 1000) {
    errors.push('Description must be 1000 characters or fewer.');
  }
};

const validateCreateSubject = (payload) => {
  const errors = [];
  const { code, name, description } = payload || {};

  validateCode(code, errors, { required: true });
  validateName(name, errors, { required: true });
  validateDescription(description, errors);

  return errors;
};

const UPDATABLE_FIELDS = ['code', 'name', 'description'];

const validateUpdateSubject = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('code')) {
    validateCode(body.code, errors, { required: false });
  }

  if (provided.includes('name')) {
    validateName(body.name, errors, { required: false });
  }

  if (provided.includes('description')) {
    validateDescription(body.description, errors);
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
  validateCreateSubject,
  validateUpdateSubject,
  validatePagination,
  UPDATABLE_FIELDS,
};
