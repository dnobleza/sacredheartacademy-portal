const isProvided = (value) => value !== undefined && value !== null && value !== '';

const TARGET_ROLES = ['all', 'students', 'teachers', 'parents'];

const validateTitle = (title, errors, { required }) => {
  if (!isProvided(title)) {
    if (required) {
      errors.push('Title is required.');
    } else {
      errors.push('Title cannot be empty.');
    }
    return;
  }

  if (typeof title !== 'string' || !title.trim()) {
    errors.push(required ? 'Title is required.' : 'Title cannot be empty.');
  } else if (title.trim().length > 200) {
    errors.push('Title must be 200 characters or fewer.');
  }
};

// content is a text column, so the database imposes no practical limit. Cap
// it here to keep a runaway paste out of the row.
const validateContent = (content, errors, { required }) => {
  if (!isProvided(content)) {
    if (required) {
      errors.push('Content is required.');
    } else {
      errors.push('Content cannot be empty.');
    }
    return;
  }

  if (typeof content !== 'string' || !content.trim()) {
    errors.push(required ? 'Content is required.' : 'Content cannot be empty.');
  } else if (content.length > 5000) {
    errors.push('Content must be 5000 characters or fewer.');
  }
};

const validateTargetRole = (targetRole, errors) => {
  if (!isProvided(targetRole)) {
    return;
  }

  if (!TARGET_ROLES.includes(targetRole)) {
    errors.push(`Target role must be one of: ${TARGET_ROLES.join(', ')}.`);
  }
};

const validateCreateAnnouncement = (payload) => {
  const errors = [];
  const { title, content, target_role: targetRole } = payload || {};

  validateTitle(title, errors, { required: true });
  validateContent(content, errors, { required: true });
  validateTargetRole(targetRole, errors);

  return errors;
};

const UPDATABLE_FIELDS = ['title', 'content', 'target_role'];

const validateUpdateAnnouncement = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('title')) {
    validateTitle(body.title, errors, { required: false });
  }

  if (provided.includes('content')) {
    validateContent(body.content, errors, { required: false });
  }

  if (provided.includes('target_role')) {
    validateTargetRole(body.target_role, errors);
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
  validateCreateAnnouncement,
  validateUpdateAnnouncement,
  validatePagination,
  TARGET_ROLES,
  UPDATABLE_FIELDS,
};
