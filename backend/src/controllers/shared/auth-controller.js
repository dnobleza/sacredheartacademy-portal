const crypto = require('crypto');
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

const findActiveUserById = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT users.id, users.email, users.status, roles.name AS role
     FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE users.id = ?`,
    [userId],
  );

  const user = rows[0];
  return user && user.status === 'active' ? user : null;
};

const refreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
});

/**
 * Best-effort cleanup of expired denylist rows. Called opportunistically on
 * logout rather than via a cron job, so the table never grows unbounded.
 */
const purgeExpiredRevokedTokens = async () => {
  try {
    await pool.execute('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
  } catch (error) {
    logger.warn(`Failed to purge expired revoked tokens: ${error.message}`);
  }
};

// A token rotated away stays usable for this long so two tabs refreshing at
// the same moment do not knock each other out. Long enough to cover a request
// already in flight, far too short to be useful to an attacker replaying a
// token captured later.
const ROTATION_GRACE_MS = 60 * 1000;

/**
 * A token is refused when it has been revoked outright (logout, where
 * redeemable_until is NULL) or when its rotation grace window has passed.
 */
const isTokenRevoked = async (jti) => {
  if (!jti) {
    return false;
  }

  const [rows] = await pool.execute(
    `SELECT id FROM revoked_tokens
     WHERE jti = ? AND (redeemable_until IS NULL OR redeemable_until < NOW())`,
    [jti],
  );

  return rows.length > 0;
};

/**
 * Records a refresh token as spent. `graceMs` of 0 revokes it outright — used
 * by logout, which must be immediate and final.
 */
const revokeToken = async (jti, userId, expSeconds, graceMs = 0) => {
  if (!jti || !userId || !expSeconds) {
    return;
  }

  const expiresAt = new Date(expSeconds * 1000);
  const redeemableUntil = graceMs > 0 ? new Date(Date.now() + graceMs) : null;

  try {
    await pool.execute(
      `INSERT INTO revoked_tokens (jti, user_id, expires_at, redeemable_until)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE redeemable_until = LEAST(
         COALESCE(VALUES(redeemable_until), '1970-01-01'),
         COALESCE(redeemable_until, '1970-01-01')
       )`,
      [jti, userId, expiresAt, redeemableUntil],
    );
  } catch (error) {
    logger.warn(`Failed to revoke refresh token jti=${jti}: ${error.message}`);
  }
};

/**
 * Signs a fresh access/refresh pair, sets the refresh cookie, and returns the
 * body shared by login and refresh so both stay in step.
 */
const issueSession = async (res, user) => {
  const profile = await findProfileByUserId(user.role, user.id);

  const tokenPayload = {
    userId: user.id,
    role: user.role,
    profileId: profile ? profile.id : null,
  };

  const accessToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, jti: crypto.randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });

  const { password_hash: passwordHash, ...safeProfile } = profile || {};

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: safeProfile,
  };
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

  return sendOk(res, await issueSession(res, user));
};

/**
 * Exchanges the httpOnly refresh cookie for a new access token so a page
 * reload does not sign the user out. The cookie is the credential here, so the
 * user row is re-read on every call — a deactivated or deleted account must not
 * be able to ride an old refresh token.
 */
const refresh = async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

  const rejectSession = () => {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Your session has expired. Please sign in again.');
  };

  if (!token) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'Your session has expired. Please sign in again.');
  }

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (error) {
    logger.warn(`Rejected refresh token from ${req.ip}: ${error.message}`);
    return rejectSession();
  }

  if (await isTokenRevoked(decoded.jti)) {
    logger.warn(`Rejected reused/revoked refresh token from ${req.ip}`);
    return rejectSession();
  }

  const user = await findActiveUserById(decoded.userId);

  if (!user) {
    return rejectSession();
  }

  // Rotation: the old token is spent, but stays valid for a brief grace window
  // so a concurrent refresh from another tab is not thrown out.
  await revokeToken(decoded.jti, decoded.userId, decoded.exp, ROTATION_GRACE_MS);

  return sendOk(res, await issueSession(res, user));
};

const me = async (req, res) => {
  const user = await findActiveUserById(req.user.userId);

  if (!user) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, 'This account is no longer active.');
  }

  const profile = await findProfileByUserId(user.role, user.id);
  const { password_hash: passwordHash, ...safeProfile } = profile || {};

  return sendOk(res, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: safeProfile,
  });
};

const logout = async (req, res) => {
  const token = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
      await revokeToken(decoded.jti, decoded.userId, decoded.exp);
    } catch (error) {
      // Already expired or unparseable — nothing to revoke. Logout must
      // still succeed and clear the cookie.
      logger.warn(`Logout with unrevocable refresh token from ${req.ip}: ${error.message}`);
    }
  }

  await purgeExpiredRevokedTokens();

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

  return sendOk(res, {});
};

module.exports = {
  login,
  refresh,
  me,
  logout,
};
