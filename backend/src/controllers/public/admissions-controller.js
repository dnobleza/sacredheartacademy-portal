const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendCreated, sendOk } = require('../../utils/send-response');
const { notifyRoles } = require('../../utils/notifications');
const {
  validateCreateApplication,
  normalizePhone,
} = require('../../validations/admission-validation');

// SECURITY: this is the only unauthenticated write in the application, so the
// rules are tighter than anywhere else.
//   - There is no read endpoint here at all. A public GET would hand out other
//     families' contact details, so submissions can only be read from the
//     admin router.
//   - status, reference_number, academic_year_id, reviewed_by and student_id
//     are set by this file, never read from the body. A caller cannot submit a
//     pre-accepted application or attach one to an existing student.
//   - The response carries only the reference number and status, so the
//     endpoint cannot be used to probe what was stored.
// Rate limiting lives on the route (admissionLimiter).

const findGradeLevel = async (gradeLevelId) => {
  const [rows] = await pool.execute('SELECT id, name FROM grade_levels WHERE id = ?', [
    gradeLevelId,
  ]);

  return rows[0] || null;
};

const findActiveAcademicYearId = async () => {
  const [rows] = await pool.execute(
    "SELECT id FROM academic_years WHERE status = 'active' LIMIT 1",
  );

  // Applications are accepted between school years too, so a missing active
  // year is recorded as NULL rather than refused.
  return rows.length > 0 ? rows[0].id : null;
};

const trimOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text === '' ? null : text;
};

const buildReferenceNumber = (id, createdAt) =>
  `SHA-${new Date(createdAt).getFullYear()}-${String(id).padStart(4, '0')}`;

const createApplication = async (req, res) => {
  const validationErrors = validateCreateApplication(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const gradeLevelId = Number(req.body.grade_level_id);
  const gradeLevel = await findGradeLevel(gradeLevelId);

  // Checked up front so an unknown id is a 400 from us rather than a 500 from
  // the foreign key.
  if (!gradeLevel) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'The selected grade level does not exist.');
  }

  const academicYearId = await findActiveAcademicYearId();

  const values = {
    academic_year_id: academicYearId,
    grade_level_id: gradeLevelId,
    first_name: trimOrNull(req.body.first_name),
    middle_name: trimOrNull(req.body.middle_name),
    last_name: trimOrNull(req.body.last_name),
    birth_date: trimOrNull(req.body.birth_date),
    gender: trimOrNull(req.body.gender),
    address: trimOrNull(req.body.address),
    email: (req.body.email || '').trim().toLowerCase(),
    contact_number: trimOrNull(normalizePhone(req.body.contact_number)),
    guardian_name: trimOrNull(req.body.guardian_name),
    guardian_relationship: trimOrNull(req.body.guardian_relationship),
    guardian_contact_number: trimOrNull(normalizePhone(req.body.guardian_contact_number)),
    guardian_email: trimOrNull(req.body.guardian_email)
      ? req.body.guardian_email.trim().toLowerCase()
      : null,
    previous_school: trimOrNull(req.body.previous_school),
    notes: trimOrNull(req.body.notes),
  };

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  // The reference number embeds the row id, so it is written in a second
  // statement inside the same transaction: either both land or neither does,
  // and the number can never collide.
  const application = await connection
    .execute(
      `INSERT INTO admission_applications
        (reference_number, academic_year_id, grade_level_id, first_name, middle_name, last_name,
         birth_date, gender, address, email, contact_number, guardian_name, guardian_relationship,
         guardian_contact_number, guardian_email, previous_school, notes, status)
       VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        values.academic_year_id,
        values.grade_level_id,
        values.first_name,
        values.middle_name,
        values.last_name,
        values.birth_date,
        values.gender,
        values.address,
        values.email,
        values.contact_number,
        values.guardian_name,
        values.guardian_relationship,
        values.guardian_contact_number,
        values.guardian_email,
        values.previous_school,
        values.notes,
      ],
    )
    .then(([result]) => {
      const referenceNumber = buildReferenceNumber(result.insertId, Date.now());

      return connection
        .execute('UPDATE admission_applications SET reference_number = ? WHERE id = ?', [
          referenceNumber,
          result.insertId,
        ])
        .then(() => ({ id: result.insertId, referenceNumber }));
    })
    .then((created) => connection.commit().then(() => created))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  await notifyRoles({
    roles: ['admin'],
    title: 'New admission application',
    message: `${values.first_name} ${values.last_name} applied for ${gradeLevel.name}. Reference ${application.referenceNumber}.`,
    type: 'admission',
  });

  logger.info(`Admission application ${application.referenceNumber} submitted`);

  return sendCreated(res, {
    reference_number: application.referenceNumber,
    status: 'pending',
  });
};

/**
 * Grade levels for the public form's dropdown. Names and ids only — this is
 * already public information on the programmes page, and the form cannot be
 * filled in without it.
 */
const listGradeLevels = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, name
     FROM grade_levels
     ORDER BY level_number IS NULL, level_number, name`,
  );

  return sendOk(res, rows);
};

module.exports = {
  createApplication,
  listGradeLevels,
};
