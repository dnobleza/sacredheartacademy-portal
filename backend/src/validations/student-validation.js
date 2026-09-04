const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = ['male', 'female', 'other'];
const STATUS_VALUES = ['active', 'inactive', 'suspended'];
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const normalizePhone = (value) =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const validatePhone = (contactNumber, errors) => {
  const normalized = normalizePhone(contactNumber);

  if (typeof normalized !== 'string' || !PHONE_REGEX.test(normalized)) {
    errors.push(
      'Contact number must be a Philippine mobile number, for example 09171234567 or +639171234567.',
    );
  }
};

const validateBirthDate = (birthDate, errors) => {
  if (typeof birthDate !== 'string' || !DATE_REGEX.test(birthDate.trim())) {
    errors.push('Birth date must use the YYYY-MM-DD format.');
    return;
  }

  const value = birthDate.trim();
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.push('Birth date must be a real calendar date.');
    return;
  }

  if (parsed.getTime() > Date.now()) {
    errors.push('Birth date cannot be in the future.');
  }
};

const validateCreateStudent = (payload) => {
  const errors = [];
  const {
    email,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    birth_date: birthDate,
    gender,
    address,
    contact_number: contactNumber,
  } = payload || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email is required.');
  } else if (email.trim().length > 255) {
    errors.push('Email must be 255 characters or fewer.');
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

  if (isProvided(birthDate)) {
    validateBirthDate(birthDate, errors);
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

  if (isProvided(contactNumber)) {
    validatePhone(contactNumber, errors);
  }

  return errors;
};

const UPDATABLE_FIELDS = [
  'email',
  'status',
  'first_name',
  'last_name',
  'middle_name',
  'birth_date',
  'gender',
  'address',
  'contact_number',
];

const validateUpdateStudent = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('email')) {
    if (
      !isProvided(body.email) ||
      typeof body.email !== 'string' ||
      !EMAIL_REGEX.test(body.email.trim())
    ) {
      errors.push('A valid email is required.');
    } else if (body.email.trim().length > 255) {
      errors.push('Email must be 255 characters or fewer.');
    }
  }

  if (provided.includes('status') && !STATUS_VALUES.includes(body.status)) {
    errors.push(`Status must be one of: ${STATUS_VALUES.join(', ')}.`);
  }

  ['first_name', 'last_name'].forEach((field) => {
    if (!provided.includes(field)) {
      return;
    }

    const value = body[field];
    const label = field === 'first_name' ? 'First name' : 'Last name';

    if (!isProvided(value) || typeof value !== 'string' || !value.trim()) {
      errors.push(`${label} cannot be empty.`);
    } else if (value.trim().length > 100) {
      errors.push(`${label} must be 100 characters or fewer.`);
    }
  });

  if (provided.includes('middle_name') && isProvided(body.middle_name)) {
    if (typeof body.middle_name !== 'string' || body.middle_name.trim().length > 100) {
      errors.push('Middle name must be 100 characters or fewer.');
    }
  }

  if (provided.includes('birth_date') && isProvided(body.birth_date)) {
    validateBirthDate(body.birth_date, errors);
  }

  if (
    provided.includes('gender') &&
    isProvided(body.gender) &&
    !GENDER_VALUES.includes(body.gender)
  ) {
    errors.push(`Gender must be one of: ${GENDER_VALUES.join(', ')}.`);
  }

  if (provided.includes('address') && isProvided(body.address)) {
    if (typeof body.address !== 'string' || body.address.length > 1000) {
      errors.push('Address must be 1000 characters or fewer.');
    }
  }

  if (provided.includes('contact_number') && isProvided(body.contact_number)) {
    validatePhone(body.contact_number, errors);
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
  validateCreateStudent,
  validateUpdateStudent,
  validatePagination,
  normalizePhone,
  UPDATABLE_FIELDS,
  GENDER_VALUES,
  STATUS_VALUES,
};
