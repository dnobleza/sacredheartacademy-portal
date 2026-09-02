const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = ['male', 'female', 'other'];

const validateCreateTeacher = (payload) => {
  const errors = [];
  const {
    email,
    employee_number: employeeNumber,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    gender,
    address,
    contact_number: contactNumber,
  } = payload || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email is required.');
  } else if (email.trim().length > 255) {
    errors.push('Email must be 255 characters or fewer.');
  }

  if (!employeeNumber || typeof employeeNumber !== 'string' || !employeeNumber.trim()) {
    errors.push('Employee number is required.');
  } else if (employeeNumber.trim().length > 50) {
    errors.push('Employee number must be 50 characters or fewer.');
  }

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    errors.push('First name is required.');
  } else if (firstName.trim().length > 100) {
    errors.push('First name must be 100 characters or fewer.');
  }

  if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
    errors.push('Last name is required.');
  } else if (lastName.trim().length > 100) {
    errors.push('Last name must be 100 characters or fewer.');
  }

  if (middleName !== undefined && middleName !== null && middleName !== '') {
    if (typeof middleName !== 'string' || middleName.trim().length > 100) {
      errors.push('Middle name must be 100 characters or fewer.');
    }
  }

  if (gender !== undefined && gender !== null && gender !== '') {
    if (!GENDER_VALUES.includes(gender)) {
      errors.push(`Gender must be one of: ${GENDER_VALUES.join(', ')}.`);
    }
  }

  if (address !== undefined && address !== null && address !== '') {
    if (typeof address !== 'string' || address.length > 1000) {
      errors.push('Address must be 1000 characters or fewer.');
    }
  }

  if (contactNumber !== undefined && contactNumber !== null && contactNumber !== '') {
    if (typeof contactNumber !== 'string' || contactNumber.trim().length > 30) {
      errors.push('Contact number must be 30 characters or fewer.');
    }
  }

  return errors;
};

const validatePagination = (query) => {
  const page = Number.parseInt(query.page, 10) > 0 ? Number.parseInt(query.page, 10) : 1;
  const rawLimit = Number.parseInt(query.limit, 10);
  const limit = rawLimit > 0 && rawLimit <= 100 ? rawLimit : 20;
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  return { page, limit, search };
};

module.exports = {
  validateCreateTeacher,
  validatePagination,
  GENDER_VALUES,
};
