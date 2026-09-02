const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');
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
    return res.status(400).json({ success: false, message: validationErrors.join(' ') });
  }

  const email = req.body.email.trim().toLowerCase();
  const { password } = req.body;

  const [users] = await pool.execute(
    `SELECT users.id, users.email, users.password_hash, users.status, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.email = ?`,
    [email]
  );

  const user = users[0];
  const genericFailureResponse = () =>
    res.status(401).json({ success: false, message: 'Invalid email or password.' });

  if (!user) {
    return genericFailureResponse();
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return genericFailureResponse();
  }

  if (user.status !== 'active') {
    return res.status(401).json({ success: false, message: 'This account is not active.' });
  }

  const profile = await findProfileByUserId(user.role, user.id);

  const tokenPayload = {
    userId: user.id,
    role: user.role,
    profileId: profile ? profile.id : null,
  };

  const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });

  const { password_hash: passwordHash, ...safeProfile } = profile || {};

  return res.status(200).json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile: safeProfile,
    },
  });
};

const logout = (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
  });

  return res.status(200).json({ success: true, data: {} });
};

module.exports = {
  login,
  logout,
};
