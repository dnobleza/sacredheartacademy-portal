const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { findSoleAccessLevelId } = require('../../utils/access-levels');
const { findOpenSection, findSectionWithHeadcount } = require('../../utils/section-assignment');
const { streamImage } = require('../../utils/stream-image');
const {
  validateReviewStatus,
  validateReturnApplication,
  missingRequirements,
  REQUIREMENTS_BY_TYPE,
} = require('../../validations/admission-validation');
const { validatePagination } = require('../../validations/student-validation');

const STUDENT_ROLE_ID = 3;
const PASSWORD_LENGTH = 12;

const STATUS_VALUES = ['pending', 'reviewing', 'returned', 'accepted', 'rejected', 'enrolled'];




const ALLOWED_TRANSITIONS = Object.freeze({
  pending: ['reviewing', 'returned', 'rejected'],
  reviewing: ['returned', 'rejected', 'accepted'],
  returned: ['reviewing', 'rejected'],
  rejected: ['reviewing'],
  accepted: ['enrolled'],
  enrolled: [],
});

const canTransition = (from, to) => (ALLOWED_TRANSITIONS[from] || []).includes(to);


const generateTemporaryPassword = () => {
  const raw = crypto.randomBytes(PASSWORD_LENGTH).toString('base64');
  const sanitized = raw.replace(/[+/=]/g, '');
  return `${sanitized.slice(0, PASSWORD_LENGTH)}!A1`;
};

const APPLICATION_SELECT_FIELDS = `
  admission_applications.id,
  admission_applications.reference_number,
  admission_applications.first_name,
  admission_applications.middle_name,
  admission_applications.last_name,
  admission_applications.birth_date,
  admission_applications.gender,
  admission_applications.address,
  admission_applications.email,
  admission_applications.contact_number,
  admission_applications.guardian_name,
  admission_applications.guardian_relationship,
  admission_applications.guardian_contact_number,
  admission_applications.guardian_email,
  admission_applications.previous_school,
  admission_applications.notes,
  admission_applications.status,
  admission_applications.review_remarks,
  admission_applications.reviewed_at,
  admission_applications.student_id,
  admission_applications.created_at,
  admission_applications.grade_level_id,
  admission_applications.academic_year_id,
  admission_applications.enrollment_type,
  admission_applications.submission_count,
  admission_applications.returned_at,
  grade_levels.name AS grade_level_name,
  academic_years.name AS academic_year_name,
  COALESCE(
    NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
    reviewer.email
  ) AS reviewed_by_name
`;

const APPLICATION_JOINS = `
  FROM admission_applications
  JOIN grade_levels ON grade_levels.id = admission_applications.grade_level_id
  LEFT JOIN academic_years ON academic_years.id = admission_applications.academic_year_id
  LEFT JOIN users AS reviewer ON reviewer.id = admission_applications.reviewed_by
  LEFT JOIN admins ON admins.user_id = reviewer.id
`;

const findApplication = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT ${APPLICATION_SELECT_FIELDS} ${APPLICATION_JOINS}
     WHERE admission_applications.id = ?`,
    [applicationId],
  );

  return rows[0] || null;
};

const findApplicationDocuments = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT id, document_type, original_name, mime_type, size_bytes, created_at
     FROM admission_documents
     WHERE application_id = ?
     ORDER BY id`,
    [applicationId],
  );

  return rows;
};

const findReturnItems = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT id, item_type, item_key, note, resolved_at, created_at
     FROM admission_return_items
     WHERE application_id = ?
     ORDER BY id`,
    [applicationId],
  );

  return rows;
};

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const listApplications = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  
  if (req.query.status) {
    if (!STATUS_VALUES.includes(req.query.status)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `Status must be one of: ${STATUS_VALUES.join(', ')}.`);
    }

    conditions.push('admission_applications.status = ?');
    params.push(req.query.status);
  }

  if (search) {
    conditions.push(`(
      admission_applications.first_name LIKE ?
      OR admission_applications.last_name LIKE ?
      OR admission_applications.reference_number LIKE ?
      OR admission_applications.email LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${APPLICATION_SELECT_FIELDS}
     ${APPLICATION_JOINS}
     ${whereClause}
     ORDER BY admission_applications.created_at DESC, admission_applications.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${APPLICATION_JOINS} ${whereClause}`,
    params,
  );

  const [documentCounts] = rows.length > 0
    ? await pool.execute(
      `SELECT application_id, document_type
       FROM admission_documents
       WHERE application_id IN (${rows.map(() => '?').join(', ')})`,
      rows.map((row) => row.id),
    )
    : [[]];

  const typesByApplication = documentCounts.reduce((map, row) => {
    map.set(row.application_id, [...(map.get(row.application_id) || []), row.document_type]);
    return map;
  }, new Map());

  return sendOk(res, {
    admissions: rows.map((row) => ({
      ...row,
      missing_document_count: missingRequirements(
        row.enrollment_type,
        typesByApplication.get(row.id) || [],
      ).length,
    })),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

const getApplicationById = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  const [documents, returnItems] = await Promise.all([
    findApplicationDocuments(applicationId),
    findReturnItems(applicationId),
  ]);

  const presentTypes = documents.map((row) => row.document_type);



  const suggestion = application.academic_year_id
    ? await findOpenSection(pool, {
      gradeLevelId: application.grade_level_id,
      academicYearId: application.academic_year_id,
    })
    : { section: null };

  return sendOk(res, {
    ...application,
    documents,
    return_items: returnItems,
    required_documents: REQUIREMENTS_BY_TYPE[application.enrollment_type] || [],
    missing_documents: missingRequirements(application.enrollment_type, presentTypes),
    suggested_section: suggestion.section
      ? {
        id: suggestion.section.id,
        name: suggestion.section.name,
        capacity: Number(suggestion.section.capacity),
        student_count: Number(suggestion.section.student_count),
        grade_level_name: suggestion.section.grade_level_name,
      }
      : null,
  });
};




const getApplicationDocument = async (req, res) => {
  const applicationId = parseId(req.params.id);
  const documentId = parseId(req.params.documentId);

  if (!applicationId || !documentId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid document id.');
  }

  const [rows] = await pool.execute(
    `SELECT id, filename, mime_type
     FROM admission_documents
     WHERE id = ? AND application_id = ?`,
    [documentId, applicationId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Document not found.');
  }

  return streamImage(res, rows[0], documentId);
};


const updateStatus = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const validationErrors = validateReviewStatus(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  
  
  if (!canTransition(application.status, req.body.status)) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `An application that is ${application.status} cannot be marked ${req.body.status}.`,
    );
  }

  const remarks = req.body.review_remarks ? String(req.body.review_remarks).trim() : null;

  await pool.execute(
    `UPDATE admission_applications
     SET status = ?, review_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [req.body.status, remarks, req.user.userId, applicationId],
  );

  logger.info(
    `Admission ${application.reference_number} set to ${req.body.status} by admin ${req.user.userId}`,
  );

  return sendOk(res, await findApplication(applicationId));
};


const findActiveAcademicYear = async () => {
  const [rows] = await pool.execute(
    "SELECT id, name FROM academic_years WHERE status = 'active' LIMIT 1",
  );

  return rows[0] || null;
};





const returnApplication = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const validationErrors = validateReturnApplication(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  if (!canTransition(application.status, 'returned')) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      `An application that is ${application.status} cannot be returned.`,
    );
  }

  const remarks = req.body.review_remarks ? String(req.body.review_remarks).trim() : null;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  await connection
    .execute(
      `UPDATE admission_applications
       SET status = 'returned', returned_at = CURRENT_TIMESTAMP, review_remarks = ?,
           reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remarks, req.user.userId, applicationId],
    )



    .then(() =>
      connection.execute(
        'DELETE FROM admission_return_items WHERE application_id = ? AND resolved_at IS NULL',
        [applicationId],
      ),
    )
    .then(() =>
      Promise.all(
        req.body.items.map((item) =>
          connection.execute(
            `INSERT INTO admission_return_items (application_id, item_type, item_key, note)
             VALUES (?, ?, ?, ?)`,
            [
              applicationId,
              item.item_type,
              item.item_key,
              item.note ? String(item.note).trim() : null,
            ],
          ),
        ),
      ),
    )
    .then(() => connection.commit())
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(
    `Admission ${application.reference_number} returned by admin ${req.user.userId} with ${req.body.items.length} item(s)`,
  );

  return sendOk(res, {
    ...(await findApplication(applicationId)),
    return_items: await findReturnItems(applicationId),
  });
};




const acceptApplication = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  
  if (application.status === 'accepted' || application.status === 'enrolled') {
    return sendError(res, HTTP_STATUS.CONFLICT, 'This application has already been accepted.');
  }

  const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [
    application.email,
  ]);

  if (existingUser.length > 0) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'An account already uses this email address. Update the application email or link the existing student manually.',
    );
  }

  
  
  const academicYear = application.academic_year_id
    ? { id: application.academic_year_id, name: application.academic_year_name }
    : await findActiveAcademicYear();

  if (!academicYear) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'No school year is marked active. Set one before approving applications.',
    );
  }

  const gradeLevelId = Number(req.body.grade_level_id);
  const sectionId = Number(req.body.section_id);

  if (!Number.isInteger(gradeLevelId) || gradeLevelId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Choose a grade level for the student.');
  }

  if (!Number.isInteger(sectionId) || sectionId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Choose a section for the student.');
  }

  const section = await findSectionWithHeadcount(pool, {
    sectionId,
    academicYearId: academicYear.id,
  });

  if (!section) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Section not found.');
  }



  if (section.grade_level_id !== gradeLevelId) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `${section.name} does not belong to the grade level you chose.`,
    );
  }

  if (Number(section.student_count) >= Number(section.capacity) && req.body.override !== true) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `${section.grade_level_name} ${section.name} is full (${section.student_count}/${section.capacity}).`,
    );
  }

  const accessLevelId = await findSoleAccessLevelId(STUDENT_ROLE_ID);
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const created = await connection
    .execute(
      `INSERT INTO users (role_id, access_level_id, email, password_hash, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [STUDENT_ROLE_ID, accessLevelId, application.email, passwordHash],
    )
    .then(([userResult]) =>
      connection
        .execute(
          `INSERT INTO students
            (user_id, first_name, last_name, middle_name, birth_date, gender, address, contact_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userResult.insertId,
            application.first_name,
            application.last_name,
            application.middle_name,
            application.birth_date,
            application.gender,
            application.address,
            application.contact_number,
          ],
        )
        .then(([studentResult]) => ({
          userId: userResult.insertId,
          studentId: studentResult.insertId,
        })),
    )
    .then(async (ids) => {
      await connection.execute(
        `INSERT INTO enrollments (student_id, academic_year_id, section_id, enrollment_date, status)
         VALUES (?, ?, ?, CURDATE(), 'active')`,
        [ids.studentId, academicYear.id, section.id],
      );

      return { ...ids, section };
    })
    .then((ids) =>
      connection
        .execute(
          `UPDATE admission_applications
           SET status = ?, student_id = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
               review_remarks = COALESCE(?, review_remarks)
           WHERE id = ?`,
          [
            'enrolled',
            ids.studentId,
            req.user.userId,
            req.body && req.body.review_remarks ? String(req.body.review_remarks).trim() : null,
            applicationId,
          ],
        )
        .then(() => ids),
    )
    .then((ids) => connection.commit().then(() => ids))
    .catch((error) => connection.rollback().then(() => Promise.reject(error)))
    .finally(() => connection.release());

  logger.info(
    `Admission ${application.reference_number} accepted by admin ${req.user.userId}; student ${created.studentId} created; enrolled in ${section.grade_level_name} ${section.name}`,
  );

  return sendOk(res, {
    application: await findApplication(applicationId),
    student: {
      id: created.studentId,
      user_id: created.userId,
      email: application.email,
      temporary_password: temporaryPassword,
    },
    placement: {
      assigned: true,
      section_id: section.id,
      section_name: section.name,
      grade_level_name: section.grade_level_name,
      academic_year_name: academicYear.name,
    },
  });
};

const acceptApplicationHandler = (req, res, next) =>
  acceptApplication(req, res).catch((error) => {
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, HTTP_STATUS.CONFLICT, 'Email is already in use.');
    }
    return next(error);
  });

const deleteApplication = async (req, res) => {
  const applicationId = parseId(req.params.id);

  if (!applicationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid application id.');
  }

  const application = await findApplication(applicationId);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Application not found.');
  }

  await pool.execute('DELETE FROM admission_applications WHERE id = ?', [applicationId]);

  logger.info(
    `Admission ${application.reference_number} deleted by admin ${req.user.userId}`,
  );

  return sendOk(res, { id: applicationId, deleted: true });
};

module.exports = {
  listApplications,
  returnApplication,
  getApplicationById,
  getApplicationDocument,
  updateStatus,
  acceptApplication: acceptApplicationHandler,
  deleteApplication,
};
