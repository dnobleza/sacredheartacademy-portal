const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const env = require('../../config/env');
const { validateLogin } = require('../../validations/auth-validation');

const ROLE_PROFILE_TABLES = {
  admin: 'admins',
  teacher: 'teachers',
  student: 'students',
  parent: 'parents',
};

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.cCkHLmVeqzJ7BOWpVDbnDCXpZBb.PWi';

const findProfileByUserId = async (roleName, userId) => {
  const tableName = ROLE_PROFILE_TABLES[roleName];

  if (!tableName) {
    return null;
  }

  const [rows] = await pool.execute(`SELECT * FROM ${tableName} WHERE user_id = ?`, [userId]);
  return rows[0] || null;
};

const login = async (req, res) => {
  const validationErrors = validateLogin(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const [users] = await pool.execute(
    `SELECT users.id, users.email, users.password_hash, users.status, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.email = ?`,
    [email],
  );

  const user = users[0];
  const genericFailureResponse = () =>
    sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password.');

  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordMatches) {
    logger.warn(`Failed login attempt for ${email} from ${req.ip}`);
    return genericFailureResponse();
  }

  if (user.status !== 'active') {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'This account is not active.');
  }

  const profile = await findProfileByUserId(user.role, user.id);

  const tokenPayload = {
    userId: user.id,
    role: user.role,
    profileId: profile ? profile.id : null,
  };

  const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });

  const { password_hash: passwordHash, ...safeProfile } = profile || {};

  return sendOk(res, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: safeProfile,
  });
};

const logout = (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });

  return sendOk(res, {});
};

module.exports = {
  login,
  logout,
};
