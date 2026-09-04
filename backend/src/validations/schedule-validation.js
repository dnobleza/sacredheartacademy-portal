const isProvided = (value) => value !== undefined && value !== null && value !== '';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// HH:MM or HH:MM:SS, 24-hour. Kept intentionally simple; MySQL rejects an
// out-of-range TIME anyway, so this just catches the common shape mistakes.
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const toMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const validatePositiveIntegerId = (value, label, errors, { required }) => {
  if (!isProvided(value)) {
    if (required) {
      errors.push(`${label} is required.`);
    }
    return;
  }

  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    errors.push(`${label} must be a positive integer.`);
  }
};

const validateDayOfWeek = (dayOfWeek, errors, { required }) => {
  if (!isProvided(dayOfWeek)) {
    if (required) {
      errors.push('Day of week is required.');
    }
    return;
  }

  if (!DAYS_OF_WEEK.includes(dayOfWeek)) {
    errors.push(`Day of week must be one of: ${DAYS_OF_WEEK.join(', ')}.`);
  }
};

const validateRoom = (room, errors) => {
  if (!isProvided(room)) {
    return;
  }

  if (typeof room !== 'string' || room.trim().length > 50) {
    errors.push('Room must be 50 characters or fewer.');
  }
};

// Validates start/end together so the "end after start" rule can be checked
// once both are known to be well-formed times.
const validateTimeRange = (startTime, endTime, errors, { required }) => {
  const startProvided = isProvided(startTime);
  const endProvided = isProvided(endTime);

  if (!startProvided && !endProvided) {
    if (required) {
      errors.push('Start time is required.');
      errors.push('End time is required.');
    }
    return;
  }

  if (required && !startProvided) {
    errors.push('Start time is required.');
  }
  if (required && !endProvided) {
    errors.push('End time is required.');
  }

  const startValid = startProvided && TIME_PATTERN.test(startTime);
  const endValid = endProvided && TIME_PATTERN.test(endTime);

  if (startProvided && !startValid) {
    errors.push('Start time must be in HH:MM or HH:MM:SS format.');
  }
  if (endProvided && !endValid) {
    errors.push('End time must be in HH:MM or HH:MM:SS format.');
  }

  if (startValid && endValid && toMinutes(endTime) <= toMinutes(startTime)) {
    errors.push('End time must be after start time.');
  }
};

const validateCreateSchedule = (payload) => {
  const errors = [];
  const body = payload || {};

  validatePositiveIntegerId(body.section_id, 'Section', errors, { required: true });
  validatePositiveIntegerId(body.subject_id, 'Subject', errors, { required: true });
  validatePositiveIntegerId(body.teacher_id, 'Teacher', errors, { required: true });
  validatePositiveIntegerId(body.academic_year_id, 'School year', errors, { required: true });
  validateDayOfWeek(body.day_of_week, errors, { required: true });
  validateTimeRange(body.start_time, body.end_time, errors, { required: true });
  validateRoom(body.room, errors);

  return errors;
};

const UPDATABLE_FIELDS = [
  'section_id',
  'subject_id',
  'teacher_id',
  'academic_year_id',
  'day_of_week',
  'start_time',
  'end_time',
  'room',
];

const validateUpdateSchedule = (payload) => {
  const errors = [];
  const body = payload || {};
  const provided = UPDATABLE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (provided.length === 0) {
    errors.push(`At least one field is required: ${UPDATABLE_FIELDS.join(', ')}.`);
    return errors;
  }

  if (provided.includes('section_id')) {
    validatePositiveIntegerId(body.section_id, 'Section', errors, { required: false });
  }
  if (provided.includes('subject_id')) {
    validatePositiveIntegerId(body.subject_id, 'Subject', errors, { required: false });
  }
  if (provided.includes('teacher_id')) {
    validatePositiveIntegerId(body.teacher_id, 'Teacher', errors, { required: false });
  }
  if (provided.includes('academic_year_id')) {
    validatePositiveIntegerId(body.academic_year_id, 'School year', errors, { required: false });
  }
  if (provided.includes('day_of_week')) {
    validateDayOfWeek(body.day_of_week, errors, { required: false });
  }
  // start_time/end_time are validated together so a partial update (e.g. only
  // start_time sent) is still checked against the existing end_time by the
  // caller, which merges provided fields onto the current row before calling
  // this the same way it validates a full create.
  if (provided.includes('start_time') || provided.includes('end_time')) {
    validateTimeRange(body.start_time, body.end_time, errors, { required: false });
  }
  if (provided.includes('room')) {
    validateRoom(body.room, errors);
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
  DAYS_OF_WEEK,
  validateCreateSchedule,
  validateUpdateSchedule,
  validatePagination,
};
