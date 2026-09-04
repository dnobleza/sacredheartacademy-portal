const isProvided = (value) => value !== undefined && value !== null && value !== '';

const isPositiveInteger = (value) => {
  const coerced = Number(value);
  return Number.isInteger(coerced) && coerced >= 1;
};

const validateCreateAdvisoryClass = (payload) => {
  const errors = [];
  const { section_id: sectionId, academic_year_id: academicYearId, teacher_id: teacherId } =
    payload || {};

  if (!isProvided(sectionId) || !isPositiveInteger(sectionId)) {
    errors.push('Section is required and must be a positive integer.');
  }

  if (!isProvided(academicYearId) || !isPositiveInteger(academicYearId)) {
    errors.push('School year is required and must be a positive integer.');
  }

  if (!isProvided(teacherId) || !isPositiveInteger(teacherId)) {
    errors.push('Teacher is required and must be a positive integer.');
  }

  return errors;
};

const UPDATABLE_FIELDS = ['section_id', 'academic_year_id', 'teacher_id'];

const validateUpdateAdvisoryClass = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('section_id') && (!isProvided(body.section_id) || !isPositiveInteger(body.section_id))) {
    errors.push('Section must be a positive integer.');
  }

  if (
    provided.includes('academic_year_id') &&
    (!isProvided(body.academic_year_id) || !isPositiveInteger(body.academic_year_id))
  ) {
    errors.push('School year must be a positive integer.');
  }

  if (provided.includes('teacher_id') && (!isProvided(body.teacher_id) || !isPositiveInteger(body.teacher_id))) {
    errors.push('Teacher must be a positive integer.');
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
  validateCreateAdvisoryClass,
  validateUpdateAdvisoryClass,
  validatePagination,
  UPDATABLE_FIELDS,
};
