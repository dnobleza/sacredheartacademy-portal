const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateLogin = (payload) => {
  const errors = [];
  const { email, password } = payload || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email is required.');
  }

  if (!password || typeof password !== 'string' || password.length < 1) {
    errors.push('Password is required.');
  }

  return errors;
};

module.exports = {
  validateLogin,
};
