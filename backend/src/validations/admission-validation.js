const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const GENDER_VALUES = ['male', 'female', 'other'];

// Statuses an admin may set directly. 'accepted' and 'enrolled' are excluded on
// purpose: accepting creates a student account, which only the accept endpoint
// may do, and 'enrolled' follows from an enrolment, not from a dropdown.
const REVIEW_STATUS_VALUES = ['reviewing', 'rejected'];

const normalizePhone = (value) =>
  typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const validateText = ({ value, label, required, maxLength, errors }) => {
  if (!isProvided(value)) {
    if (required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${label} is required.`);
    return;
  }

  if (value.trim().length > maxLength) {
    errors.push(`${label} must be ${maxLength} characters or fewer.`);
  }
};

const validateEmailField = ({ value, label, required, errors }) => {
  if (!isProvided(value)) {
    if (required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  if (typeof value !== 'string' || !EMAIL_REGEX.test(value.trim())) {
    errors.push(`${label} must be a valid email address.`);
  } else if (value.trim().length > 255) {
    errors.push(`${label} must be 255 characters or fewer.`);
  }
};

const validatePhoneField = ({ value, label, required, errors }) => {
  if (!isProvided(value)) {
    if (required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  const normalized = normalizePhone(value);

  if (typeof normalized !== 'string' || !PHONE_REGEX.test(normalized)) {
    errors.push(
      `${label} must be a Philippine mobile number, for example 09171234567 or +639171234567.`,
    );
  }
};

// Mirrors validateBirthDate in student-validation.js.
const validateBirthDate = (birthDate, errors) => {
  if (!isProvided(birthDate)) {
    return;
  }

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

/**
 * A public, unauthenticated payload, so every field is checked here and none of
 * status, reference_number, reviewed_by or student_id is read from the body at
 * all — the controller sets those itself.
 */
const validateCreateApplication = (payload) => {
  const errors = [];
  const body = payload || {};

  validateText({ value: body.first_name, label: 'First name', required: true, maxLength: 100, errors });
  validateText({ value: body.middle_name, label: 'Middle name', required: false, maxLength: 100, errors });
  validateText({ value: body.last_name, label: 'Last name', required: true, maxLength: 100, errors });
  validateText({ value: body.address, label: 'Address', required: false, maxLength: 1000, errors });
  validateText({
    value: body.previous_school,
    label: 'Previous school',
    required: false,
    maxLength: 200,
    errors,
  });
  validateText({ value: body.notes, label: 'Notes', required: false, maxLength: 1000, errors });

  validateEmailField({ value: body.email, label: 'Email', required: true, errors });
  validatePhoneField({ value: body.contact_number, label: 'Contact number', required: false, errors });
  validateBirthDate(body.birth_date, errors);

  if (isProvided(body.gender) && !GENDER_VALUES.includes(body.gender)) {
    errors.push(`Gender must be one of: ${GENDER_VALUES.join(', ')}.`);
  }

  const gradeLevelId = Number(body.grade_level_id);

  if (!Number.isInteger(gradeLevelId) || gradeLevelId < 1) {
    errors.push('A grade level is required.');
  }

  validateText({
    value: body.guardian_name,
    label: 'Parent or guardian name',
    required: true,
    maxLength: 200,
    errors,
  });
  validateText({
    value: body.guardian_relationship,
    label: 'Relationship to the applicant',
    required: false,
    maxLength: 50,
    errors,
  });
  validatePhoneField({
    value: body.guardian_contact_number,
    label: 'Parent or guardian contact number',
    required: true,
    errors,
  });
  validateEmailField({
    value: body.guardian_email,
    label: 'Parent or guardian email',
    required: false,
    errors,
  });

  return errors;
};

const validateReviewStatus = (payload) => {
  const errors = [];
  const body = payload || {};

  if (!REVIEW_STATUS_VALUES.includes(body.status)) {
    errors.push(`Status must be one of: ${REVIEW_STATUS_VALUES.join(', ')}.`);
  }

  validateText({
    value: body.review_remarks,
    label: 'Remarks',
    required: false,
    maxLength: 1000,
    errors,
  });

  return errors;
};

module.exports = {
  validateCreateApplication,
  validateReviewStatus,
  normalizePhone,
  GENDER_VALUES,
  REVIEW_STATUS_VALUES,
};
