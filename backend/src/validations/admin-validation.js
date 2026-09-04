const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = ['male', 'female', 'other'];
const STATUS_VALUES = ['active', 'inactive', 'suspended'];
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;

const normalizePhone = (value) =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

const isProvided = (value) => value !== undefined && value !== null && value !== '';

// Only checks the shape. Whether the id exists and belongs to the admin role
// needs a database read, so the controller does that part.
const validateAccessLevelId = (accessLevelId, errors) => {
  const parsed = Number(accessLevelId);

  if (!Number.isInteger(parsed) || parsed < 1) {
    errors.push('Access level is required and must be a valid selection.');
  }
};

const validatePhone = (contactNumber, errors) => {
  const normalized = normalizePhone(contactNumber);

  if (typeof normalized !== 'string' || !PHONE_REGEX.test(normalized)) {
    errors.push(
      'Contact number must be a Philippine mobile number, for example 09171234567 or +639171234567.',
    );
  }
};

// Only checks the shape. Whether the id exists needs a database read, so the
// controller does that part (findImage), same as access_level_id.
const validateImageId = (imageId, errors) => {
  if (!isProvided(imageId)) {
    return;
  }

  if (imageId !== null && (!Number.isInteger(Number(imageId)) || Number(imageId) < 1)) {
    errors.push('Image must be a valid selection.');
  }
};

const validateCreateAdmin = (payload) => {
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
    access_level_id: accessLevelId,
    photo_id: photoId,
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

  if (isProvided(contactNumber)) {
    validatePhone(contactNumber, errors);
  }

  validateAccessLevelId(accessLevelId, errors);
  validateImageId(photoId, errors);

  return errors;
};

const UPDATABLE_FIELDS = [
  'email',
  'status',
  'access_level_id',
  'employee_number',
  'first_name',
  'last_name',
  'middle_name',
  'gender',
  'address',
  'contact_number',
  'photo_id',
];

const validateUpdateAdmin = (payload) => {
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

  if (provided.includes('access_level_id')) {
    validateAccessLevelId(body.access_level_id, errors);
  }

  if (provided.includes('employee_number')) {
    const employeeNumber = body.employee_number;

    if (
      !isProvided(employeeNumber) ||
      typeof employeeNumber !== 'string' ||
      !employeeNumber.trim()
    ) {
      errors.push('Employee number cannot be empty.');
    } else if (employeeNumber.trim().length > 50) {
      errors.push('Employee number must be 50 characters or fewer.');
    }
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

  if (provided.includes('photo_id')) {
    validateImageId(body.photo_id, errors);
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
  validateCreateAdmin,
  validateUpdateAdmin,
  validatePagination,
  normalizePhone,
  UPDATABLE_FIELDS,
  GENDER_VALUES,
  STATUS_VALUES,
};
