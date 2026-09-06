const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendCreated, sendOk } = require('../../utils/send-response');
const { notifyRoles } = require('../../utils/notifications');
const {
  buildStudentAccount,
  getDownpaymentRequirement,
} = require('../../utils/billing');
const { createDeclaration } = require('../shared/declarations-controller');
const path = require('path');
const { collectFiles, discardFiles, UPLOAD_DIR } = require('../../middleware/upload');
const {
  validateCreateApplication,
  validateAdmissionDocuments,
  normalizePhone,
  missingRequirements,
  DOCUMENT_TYPES,
  ENROLLMENT_TYPES,
  REQUIREMENTS_BY_TYPE,
} = require('../../validations/admission-validation');













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

const insertDocuments = async (connection, applicationId, files) => {
  const entries = Object.entries(files || {});

  await Promise.all(
    entries.map(([documentType, [file]]) =>
      connection.execute(
        `INSERT INTO admission_documents
          (application_id, document_type, filename, original_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          applicationId,
          documentType,
          file.filename,
          file.originalname ? file.originalname.slice(0, 255) : null,
          file.mimetype,
          file.size,
        ],
      ),
    ),
  );

  return entries.length;
};

const createApplication = async (req, res) => {
  const uploadedFiles = collectFiles(req);
  const validationErrors = [
    ...validateCreateApplication(req.body),
    ...validateAdmissionDocuments(req.files),
  ];

  if (validationErrors.length > 0) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const gradeLevelId = Number(req.body.grade_level_id);
  const gradeLevel = await findGradeLevel(gradeLevelId);

  
  
  if (!gradeLevel) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'The selected grade level does not exist.');
  }

  
  
  const requestedYearId = Number(req.body.academic_year_id);
  let academicYearId;

  if (Number.isInteger(requestedYearId) && requestedYearId > 0) {
    const [yearRows] = await pool.execute(
      "SELECT id FROM academic_years WHERE id = ? AND status IN ('upcoming', 'active')",
      [requestedYearId],
    );

    if (yearRows.length === 0) {
      discardFiles(uploadedFiles);
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'That school year is not open for applications.');
    }

    academicYearId = requestedYearId;
  } else {
    academicYearId = await findActiveAcademicYearId();
  }

  const enrollmentType = ENROLLMENT_TYPES.includes(req.body.enrollment_type)
    ? req.body.enrollment_type
    : 'new';

  const values = {
    academic_year_id: academicYearId,
    enrollment_type: enrollmentType,
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

  
  
  
  const application = await connection
    .execute(
      `INSERT INTO admission_applications
        (reference_number, academic_year_id, grade_level_id, enrollment_type, first_name, middle_name,
         last_name, birth_date, gender, address, email, contact_number, guardian_name,
         guardian_relationship, guardian_contact_number, guardian_email, previous_school, notes, status)
       VALUES ('', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        values.academic_year_id,
        values.grade_level_id,
        values.enrollment_type,
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
        .then(() => insertDocuments(connection, result.insertId, req.files))
        .then((documentCount) => ({ id: result.insertId, referenceNumber, documentCount }));
    })
    .then((created) => connection.commit().then(() => created))
    .catch((error) =>
      connection.rollback().then(() => {
        
        discardFiles(uploadedFiles);
        return Promise.reject(error);
      }),
    )
    .finally(() => connection.release());

  await notifyRoles({
    roles: ['admin'],
    title: 'New admission application',
    message: `${values.first_name} ${values.last_name} applied for ${gradeLevel.name}. Reference ${application.referenceNumber}. ${
      application.documentCount > 0
        ? `${application.documentCount} document(s) attached.`
        : 'No documents attached.'
    }`,
    type: 'admission',
  });

  logger.info(`Admission application ${application.referenceNumber} submitted`);

  return sendCreated(res, {
    reference_number: application.referenceNumber,
    status: 'pending',
    documents_received: application.documentCount,
  });
};





const NOT_FOUND_MESSAGE =
  'No application matches that reference number and email address.';




const findApplicationByReference = async (reference, email) => {
  if (typeof reference !== 'string' || typeof email !== 'string') {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT
       admission_applications.id,
       admission_applications.reference_number,
       admission_applications.enrollment_type,
       admission_applications.status,
       admission_applications.submission_count,
       admission_applications.first_name,
       admission_applications.middle_name,
       admission_applications.last_name,
       admission_applications.birth_date,
       admission_applications.gender,
       admission_applications.address,
       admission_applications.email,
       admission_applications.contact_number,
       admission_applications.previous_school,
       admission_applications.guardian_name,
       admission_applications.guardian_relationship,
       admission_applications.guardian_contact_number,
       admission_applications.guardian_email,
       admission_applications.review_remarks,
       admission_applications.returned_at,
       admission_applications.created_at,
       admission_applications.student_id,
       admission_applications.academic_year_id,
       grade_levels.name AS grade_level_name,
       academic_years.name AS academic_year_name
     FROM admission_applications
     JOIN grade_levels ON grade_levels.id = admission_applications.grade_level_id
     LEFT JOIN academic_years ON academic_years.id = admission_applications.academic_year_id
     WHERE admission_applications.reference_number = ?
       AND LOWER(admission_applications.email) = ?`,
    [reference.trim(), email.trim().toLowerCase()],
  );

  return rows[0] || null;
};

const findReturnItems = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT id, item_type, item_key, note, resolved_at
     FROM admission_return_items
     WHERE application_id = ?
     ORDER BY id`,
    [applicationId],
  );

  return rows;
};

const findDocumentTypes = async (applicationId) => {
  const [rows] = await pool.execute(
    `SELECT document_type, original_name, size_bytes, created_at
     FROM admission_documents
     WHERE application_id = ?`,
    [applicationId],
  );

  return rows;
};




const findDeclarations = async (studentId) => {
  const [rows] = await pool.execute(
    `SELECT
       payment_declarations.id,
       payment_declarations.amount,
       payment_declarations.method,
       payment_declarations.reference_no,
       payment_declarations.status,
       payment_declarations.payment_id,
       payment_declarations.review_remarks,
       payment_declarations.created_at,
       payments.or_number
     FROM payment_declarations
     LEFT JOIN payments ON payments.id = payment_declarations.payment_id
     WHERE payment_declarations.student_id = ?
     ORDER BY payment_declarations.created_at DESC`,
    [studentId],
  );

  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
};




const getApplicationStatus = async (req, res) => {
  const application = await findApplicationByReference(req.query.reference, req.query.email);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, NOT_FOUND_MESSAGE);
  }

  const [documents, returnItems] = await Promise.all([
    findDocumentTypes(application.id),
    findReturnItems(application.id),
  ]);

  const presentTypes = documents.map((row) => row.document_type);



  let payment = null;

  if (application.student_id && application.academic_year_id) {
    const [downpayment, account, declarations] = await Promise.all([
      getDownpaymentRequirement(application.student_id, application.academic_year_id),
      buildStudentAccount(application.student_id, application.academic_year_id),
      findDeclarations(application.student_id),
    ]);

    payment = {
      downpayment,
      charges: account ? account.charges : [],
      balance: account ? account.totals.balance : 0,
      total_charges: account ? account.totals.total_charges : 0,
      total_paid: account ? account.totals.total_paid : 0,
      declarations,
      has_pending: declarations.some((row) => row.status === 'pending'),
    };
  }



  const {
    id,
    student_id: hiddenStudentId,
    academic_year_id: hiddenYearId,
    ...safeApplication
  } = application;

  return sendOk(res, {
    application: safeApplication,
    payment,
    documents,
    required_documents: REQUIREMENTS_BY_TYPE[application.enrollment_type] || [],
    missing_documents: missingRequirements(application.enrollment_type, presentTypes),
    return_items: returnItems.filter((item) => !item.resolved_at),
  });
};




const RESUBMITTABLE_FIELDS = [
  'first_name',
  'middle_name',
  'last_name',
  'birth_date',
  'gender',
  'address',
  'contact_number',
  'previous_school',
  'guardian_name',
  'guardian_relationship',
  'guardian_contact_number',
  'guardian_email',
  'notes',
];

const PHONE_FIELDS = ['contact_number', 'guardian_contact_number'];




const replaceDocument = async (connection, applicationId, documentType, file) => {
  const [existing] = await connection.execute(
    'SELECT filename FROM admission_documents WHERE application_id = ? AND document_type = ?',
    [applicationId, documentType],
  );

  await connection.execute(
    'DELETE FROM admission_documents WHERE application_id = ? AND document_type = ?',
    [applicationId, documentType],
  );

  await connection.execute(
    `INSERT INTO admission_documents
      (application_id, document_type, filename, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      applicationId,
      documentType,
      file.filename,
      file.originalname ? file.originalname.slice(0, 255) : null,
      file.mimetype,
      file.size,
    ],
  );

  return existing.map((row) => row.filename);
};




const resubmitApplication = async (req, res) => {
  const uploadedFiles = collectFiles(req);
  const validationErrors = validateAdmissionDocuments(req.files);

  if (validationErrors.length > 0) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const application = await findApplicationByReference(req.params.reference, req.body.email);

  if (!application) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.NOT_FOUND, NOT_FOUND_MESSAGE);
  }



  if (application.status !== 'returned') {
    discardFiles(uploadedFiles);
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'This application is not waiting on you. Only a returned application can be resubmitted.',
    );
  }

  const updatedFields = [];
  const params = [];

  RESUBMITTABLE_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
      return;
    }

    const raw = PHONE_FIELDS.includes(field) ? normalizePhone(req.body[field]) : req.body[field];

    updatedFields.push(field);
    params.push(trimOrNull(raw));
  });

  const assignments = updatedFields.map((field) => `${field} = ?`);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  const replacedFilenames = await connection
    .execute(
      `UPDATE admission_applications
       SET ${assignments.length > 0 ? `${assignments.join(', ')}, ` : ''}
           status = 'pending',
           returned_at = NULL,
           submission_count = submission_count + 1
       WHERE id = ?`,
      [...params, application.id],
    )
    .then(async () => {
      const stale = [];

      for (const [documentType, files] of Object.entries(req.files || {})) {
        const previous = await replaceDocument(connection, application.id, documentType, files[0]);
        stale.push(...previous);
      }

      return stale;
    })
    .then(async (stale) => {


      const resolvedKeys = [...Object.keys(req.files || {}), ...updatedFields];

      if (resolvedKeys.length > 0) {
        const placeholders = resolvedKeys.map(() => '?').join(', ');

        await connection.execute(
          `UPDATE admission_return_items
           SET resolved_at = CURRENT_TIMESTAMP
           WHERE application_id = ? AND resolved_at IS NULL AND item_key IN (${placeholders})`,
          [application.id, ...resolvedKeys],
        );
      }

      return stale;
    })
    .then((stale) => connection.commit().then(() => stale))
    .catch((error) =>
      connection.rollback().then(() => {
        discardFiles(uploadedFiles);
        return Promise.reject(error);
      }),
    )
    .finally(() => connection.release());



  discardFiles(replacedFilenames.map((filename) => ({ path: path.join(UPLOAD_DIR, filename) })));

  await notifyRoles({
    roles: ['admin'],
    title: 'Application resubmitted',
    message: `${application.first_name} ${application.last_name} resubmitted application ${application.reference_number}.`,
    type: 'admission',
  });

  logger.info(`Admission application ${application.reference_number} resubmitted`);

  return sendOk(res, {
    reference_number: application.reference_number,
    status: 'pending',
    documents_received: Object.keys(req.files || {}).length,
  });
};

const getPaymentReceipt = async (req, res) => {
  const application = await findApplicationByReference(req.params.reference, req.query.email);

  if (!application) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, NOT_FOUND_MESSAGE);
  }

  const paymentId = Number(req.params.paymentId);

  if (!Number.isInteger(paymentId) || paymentId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid payment id.');
  }




  const [rows] = await pool.execute(
    `SELECT
       payments.id,
       payments.or_number,
       payments.amount,
       payments.payment_type,
       payments.method,
       payments.reference_no,
       payments.paid_at,
       payments.academic_year_id,
       academic_years.name AS academic_year_name,
       students.student_number,
       students.first_name,
       students.middle_name,
       students.last_name,
       CONCAT_WS(' ', cashiers.first_name, cashiers.last_name) AS cashier_name
     FROM payments
     JOIN students ON students.id = payments.student_id
     LEFT JOIN academic_years ON academic_years.id = payments.academic_year_id
     LEFT JOIN admins AS cashiers ON cashiers.id = payments.cashier_id
     WHERE payments.id = ? AND payments.student_id = ?`,
    [paymentId, application.student_id],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Receipt not found.');
  }

  const [items] = await pool.execute(
    `SELECT payment_items.fee_id, fees.name AS fee_name, payment_items.amount
     FROM payment_items
     JOIN fees ON fees.id = payment_items.fee_id
     WHERE payment_items.payment_id = ?
     ORDER BY fees.id`,
    [paymentId],
  );

  const account = await buildStudentAccount(application.student_id, rows[0].academic_year_id);

  return sendOk(res, {
    payment: { ...rows[0], amount: Number(rows[0].amount) },
    items: items.map((item) => ({ ...item, amount: Number(item.amount) })),
    balance_after: account ? account.totals.balance : null,
    total_charges: account ? account.totals.total_charges : null,
  });
};




const declarePaymentForApplication = async (req, res) => {
  const uploadedFiles = collectFiles(req);
  const application = await findApplicationByReference(req.params.reference, req.body.email);

  if (!application) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.NOT_FOUND, NOT_FOUND_MESSAGE);
  }




  if (application.status !== 'accepted' || !application.student_id) {
    discardFiles(uploadedFiles);
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'Payments can only be reported once your application has been approved.',
    );
  }

  if (!application.academic_year_id) {
    discardFiles(uploadedFiles);
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'This application has no school year.');
  }




  const [[student]] = await pool.execute('SELECT user_id FROM students WHERE id = ?', [
    application.student_id,
  ]);

  let proofImageId = null;
  const proof = (req.files && req.files.proof && req.files.proof[0]) || null;

  if (proof) {
    const [image] = await pool.execute(
      `INSERT INTO images (filename, original_name, mime_type, size_bytes, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        proof.filename,
        proof.originalname ? proof.originalname.slice(0, 255) : null,
        proof.mimetype,
        proof.size,
        student.user_id,
      ],
    );

    proofImageId = image.insertId;
  }

  const { error, declaration } = await createDeclaration({
    studentId: application.student_id,
    academicYearId: application.academic_year_id,
    amount: req.body.amount,
    method: req.body.method,
    referenceNo: req.body.reference_no,
    note: req.body.note,
    proofImageId,
  });

  if (error) {


    if (proofImageId) {
      await pool.execute('DELETE FROM images WHERE id = ?', [proofImageId]);
    }

    discardFiles(uploadedFiles);
    return sendError(res, error.status, error.message);
  }

  logger.info(
    `Payment declared from the status page for application ${application.reference_number}`,
  );

  return sendCreated(res, declaration);
};




const listAcademicYears = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, name, start_date, end_date, status
     FROM academic_years
     WHERE status IN ('upcoming', 'active')
     ORDER BY status = 'active' DESC, start_date`,
  );

  return sendOk(res, rows);
};

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
  getPaymentReceipt,
  declarePaymentForApplication,
  listAcademicYears,
  listGradeLevels,
  getApplicationStatus,
  resubmitApplication,
};
