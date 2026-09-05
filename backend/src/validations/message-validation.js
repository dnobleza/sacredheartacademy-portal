const MESSAGE_MAX_LENGTH = 5000;
const SUBJECT_MAX_LENGTH = 200;

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const validateCreateMessage = (payload) => {
  const errors = [];
  const { receiver_id: receiverId, message, subject } = payload || {};

  if (!Number.isInteger(Number(receiverId)) || Number(receiverId) < 1) {
    errors.push('A valid receiver_id is required.');
  }

  if (!isProvided(message) || typeof message !== 'string' || !message.trim()) {
    errors.push('Message is required.');
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.push(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);
  }

  if (isProvided(subject)) {
    if (typeof subject !== 'string' || subject.length > SUBJECT_MAX_LENGTH) {
      errors.push(`Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer.`);
    }
  }

  return errors;
};

/**
 * An edit only ever replaces the body. subject and receiver_id are not
 * editable: re-addressing a delivered message would move it into a thread the
 * recipient never took part in.
 */
const validateUpdateMessage = (payload) => {
  const errors = [];
  const { message } = payload || {};

  if (!isProvided(message) || typeof message !== 'string' || !message.trim()) {
    errors.push('Message is required.');
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.push(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);
  }

  return errors;
};

module.exports = {
  validateCreateMessage,
  validateUpdateMessage,
  MESSAGE_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
};
