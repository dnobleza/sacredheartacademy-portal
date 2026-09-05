/**
 * Creates the first Super Admin so a freshly seeded database can be signed
 * into. init/ seeds reference data (roles, access levels, grade levels) but
 * deliberately no accounts: a password committed to this repository would be a
 * published credential for every environment that ever ran those files.
 *
 * Run it once per environment, with the credentials supplied as environment
 * variables:
 *
 *   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='...' npm run seed:admin
 *
 * Against the compose stack:
 *
 *   docker compose exec -e SEED_ADMIN_EMAIL=... -e SEED_ADMIN_PASSWORD='...' \
 *     api npm run seed:admin
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const ADMIN_ROLE = 'admin';
const SUPER_ADMIN_LEVEL = 4;
const MIN_PASSWORD_LENGTH = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (message) => {
  console.error(`seed-admin: ${message}`);
  process.exitCode = 1;
};

const run = async () => {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const firstName = (process.env.SEED_ADMIN_FIRST_NAME || 'Super').trim();
  const lastName = (process.env.SEED_ADMIN_LAST_NAME || 'Admin').trim();
  const employeeNumber = (process.env.SEED_ADMIN_EMPLOYEE_NUMBER || 'EMP-0001').trim();

  if (!EMAIL_REGEX.test(email)) {
    return fail('SEED_ADMIN_EMAIL must be a valid email address.');
  }

  // Long enough that a seeded account is not the weak point of an environment
  // someone later exposes.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const [[role]] = await pool.query('SELECT id FROM roles WHERE name = ?', [ADMIN_ROLE]);

  if (!role) {
    return fail("No 'admin' role found. Seed init/002_seed_roles.sql first.");
  }

  const [[accessLevel]] = await pool.query(
    'SELECT id FROM access_levels WHERE role_id = ? AND level = ?',
    [role.id, SUPER_ADMIN_LEVEL],
  );

  if (!accessLevel) {
    return fail('No Super Admin access level found. Seed init/003_seed_access_levels.sql first.');
  }

  // Refuses rather than overwriting: this script must never be able to reset a
  // real administrator's password, or quietly mint a second privileged account
  // in an environment that already has one.
  const [[existingAdmin]] = await pool.query(
    'SELECT COUNT(*) AS total FROM users WHERE role_id = ?',
    [role.id],
  );

  if (existingAdmin.total > 0) {
    console.log('seed-admin: an admin account already exists, nothing to do.');
    return undefined;
  }

  const [[existingEmail]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

  if (existingEmail) {
    return fail('That email address is already in use.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [userResult] = await connection.execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [role.id, accessLevel.id, email, passwordHash],
    );

    await connection.execute(
      `INSERT INTO admins (user_id, employee_number, first_name, last_name)
       VALUES (?, ?, ?, ?)`,
      [userResult.insertId, employeeNumber, firstName, lastName],
    );

    await connection.commit();
    console.log(`seed-admin: created Super Admin ${email}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return undefined;
};

run()
  .catch((error) => fail(error.message))
  .finally(() => pool.end());
