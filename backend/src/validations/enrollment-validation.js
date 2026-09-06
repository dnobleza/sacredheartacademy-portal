const ENROLLMENT_STATUS_VALUES = ['active', 'completed', 'dropped'];

const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};




const validateCreateEnrollment = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!parsePositiveInteger(body.student_id)) {
    errors.push('A student must be selected.');
  }



  if (body.section_id !== undefined && body.section_id !== null && body.section_id !== '') {
    if (!parsePositiveInteger(body.section_id)) {
      errors.push('Section must be a valid selection.');
    }
  }

  if (
    body.academic_year_id !== undefined
    && body.academic_year_id !== null
    && body.academic_year_id !== ''
    && !parsePositiveInteger(body.academic_year_id)
  ) {
    errors.push('School year must be a valid selection.');
  }

  return errors;
};




const validateMoveEnrollment = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!parsePositiveInteger(body.section_id)) {
    errors.push('A section must be selected.');
  }

  if (
    body.status !== undefined
    && body.status !== null
    && body.status !== ''
    && !ENROLLMENT_STATUS_VALUES.includes(body.status)
  ) {
    errors.push(`Status must be one of: ${ENROLLMENT_STATUS_VALUES.join(', ')}.`);
  }

  return errors;
};

module.exports = {
  validateCreateEnrollment,
  validateMoveEnrollment,
  parsePositiveInteger,
  ENROLLMENT_STATUS_VALUES,
};
