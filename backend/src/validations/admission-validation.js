const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:\+63|0)9\d{9}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const GENDER_VALUES = ['male', 'female', 'other'];




const REVIEW_STATUS_VALUES = ['reviewing', 'rejected'];

const ENROLLMENT_TYPES = ['new', 'returning', 'transferee'];

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

  if (isProvided(body.enrollment_type) && !ENROLLMENT_TYPES.includes(body.enrollment_type)) {
    errors.push(`Enrollment type must be one of: ${ENROLLMENT_TYPES.join(', ')}.`);
  }

  
  
  if (isProvided(body.academic_year_id)) {
    const academicYearId = Number(body.academic_year_id);

    if (!Number.isInteger(academicYearId) || academicYearId < 1) {
      errors.push('School year must be a valid selection.');
    }
  }

  return errors;
};

const DOCUMENT_TYPES = ['good_moral', 'form_137', 'psa_birth_certificate', 'id_picture'];




const REQUIREMENTS_BY_TYPE = Object.freeze({
  new: ['psa_birth_certificate', 'id_picture'],
  returning: ['id_picture'],
  transferee: ['form_137', 'good_moral', 'psa_birth_certificate', 'id_picture'],
});




const RETURNABLE_FIELDS = [
  'first_name',
  'middle_name',
  'last_name',
  'birth_date',
  'gender',
  'address',
  'email',
  'contact_number',
  'previous_school',
  'guardian_name',
  'guardian_relationship',
  'guardian_contact_number',
  'guardian_email',
  'grade_level_id',
];




const validateReturnApplication = (payload) => {
  const errors = [];
  const body = payload || {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    errors.push('Select at least one item the applicant needs to fix.');
    return errors;
  }

  const seen = new Set();

  items.forEach((item) => {
    const entry = item || {};

    if (entry.item_type !== 'document' && entry.item_type !== 'information') {
      errors.push('Each item must be a document or an information item.');
      return;
    }

    const allowed = entry.item_type === 'document' ? DOCUMENT_TYPES : RETURNABLE_FIELDS;

    if (!allowed.includes(entry.item_key)) {
      errors.push(`${entry.item_key} is not something that can be returned.`);
      return;
    }

    const key = `${entry.item_type}:${entry.item_key}`;

    if (seen.has(key)) {
      errors.push('The same item was listed twice.');
      return;
    }

    seen.add(key);

    validateText({
      value: entry.note,
      label: 'Item note',
      required: false,
      maxLength: 255,
      errors,
    });
  });

  validateText({
    value: body.review_remarks,
    label: 'Remarks',
    required: false,
    maxLength: 1000,
    errors,
  });

  return errors;
};




const missingRequirements = (enrollmentType, presentTypes) => {
  const required = REQUIREMENTS_BY_TYPE[enrollmentType] || REQUIREMENTS_BY_TYPE.new;

  return required.filter((type) => !presentTypes.includes(type));
};




const validateAdmissionDocuments = (files) => {
  const errors = [];
  const uploaded = files || {};

  Object.keys(uploaded).forEach((field) => {
    if (!DOCUMENT_TYPES.includes(field)) {
      errors.push(`${field} is not a document this form accepts.`);
      return;
    }

    if (uploaded[field].length > 1) {
      errors.push(`Only one file may be attached per document.`);
    }
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
  validateAdmissionDocuments,
  validateReturnApplication,
  validateReviewStatus,
  missingRequirements,
  DOCUMENT_TYPES,
  ENROLLMENT_TYPES,
  REQUIREMENTS_BY_TYPE,
  RETURNABLE_FIELDS,
  normalizePhone,
  GENDER_VALUES,
  REVIEW_STATUS_VALUES,
};
