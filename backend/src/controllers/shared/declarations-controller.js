const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { toAmount, isValidAmount } = require('../../utils/money');
const { buildStudentAccount, getActiveAcademicYear } = require('../../utils/billing');
const { notifyUser, notifyAccessLevel } = require('../../utils/notifications');
const { ACCESS_LEVEL_IDS } = require('../../utils/access-levels');
const { PAYMENT_METHODS } = require('../../validations/payment-validation');
const {
  recordPayment,
  spreadOverOldestCharges,
  checkAllocations,
  findOpenSession,
} = require('../cashier/payments-controller');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const DECLARATION_SELECT = `
  payment_declarations.id,
  payment_declarations.student_id,
  payment_declarations.amount,
  payment_declarations.method,
  payment_declarations.reference_no,
  payment_declarations.note,
  payment_declarations.proof_image_id,
  payment_declarations.status,
  payment_declarations.payment_id,
  payment_declarations.review_remarks,
  payment_declarations.reviewed_at,
  payment_declarations.created_at,
  students.student_number,
  students.first_name,
  students.last_name,
  payments.or_number
`;

const DECLARATION_JOINS = `
  FROM payment_declarations
  JOIN students ON students.id = payment_declarations.student_id
  LEFT JOIN payments ON payments.id = payment_declarations.payment_id
`;

const toNumbers = (rows) => rows.map((row) => ({ ...row, amount: Number(row.amount) }));




const createDeclaration = async ({
  studentId,
  academicYearId,
  amount,
  method,
  referenceNo,
  note,
  proofImageId,
  executor = pool,
}) => {
  const errors = [];

  if (!isValidAmount(amount)) {
    errors.push('Amount must be greater than zero, with at most two decimals.');
  }

  if (!PAYMENT_METHODS.includes(method)) {
    errors.push(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`);
  }

  if (referenceNo && String(referenceNo).trim().length > 50) {
    errors.push('Reference number must be 50 characters or fewer.');
  }

  if (note && String(note).trim().length > 255) {
    errors.push('Note must be 255 characters or fewer.');
  }

  if (errors.length > 0) {
    return { error: { status: HTTP_STATUS.BAD_REQUEST, message: errors.join(' ') } };
  }




  const [pending] = await executor.execute(
    "SELECT id FROM payment_declarations WHERE student_id = ? AND status = 'pending' LIMIT 1",
    [studentId],
  );

  if (pending.length > 0) {
    return {
      error: {
        status: HTTP_STATUS.CONFLICT,
        message: 'There is already a payment waiting for the cashier to confirm.',
      },
    };
  }

  const account = await buildStudentAccount(studentId, academicYearId);

  if (!account) {
    return { error: { status: HTTP_STATUS.NOT_FOUND, message: 'Student not found.' } };
  }

  const value = toAmount(amount);




  if (value > account.totals.balance) {
    return {
      error: {
        status: HTTP_STATUS.BAD_REQUEST,
        message: `That is more than the outstanding balance of ${account.totals.balance}.`,
      },
    };
  }

  const [result] = await executor.execute(
    `INSERT INTO payment_declarations
      (student_id, academic_year_id, amount, method, reference_no, note, proof_image_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      academicYearId,
      value,
      method,
      referenceNo ? String(referenceNo).trim() : null,
      note ? String(note).trim() : null,
      proofImageId || null,
    ],
  );




  await notifyAccessLevel({
    accessLevelId: ACCESS_LEVEL_IDS.CASHIER,
    title: 'Payment to confirm',
    message: `${account.student.first_name} ${account.student.last_name} declared a payment of ${value}. Confirm it to record the receipt.`,
    type: 'payment',
  });

  logger.info(`Payment declaration ${result.insertId} submitted for student ${studentId}`);

  return { declaration: { id: result.insertId, amount: value, status: 'pending' } };
};




const declarePayment = async (req, res) => {
  const studentId = req.user.profileId;

  if (!studentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No student profile is linked to this account.');
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No school year is marked active.');
  }

  const { error, declaration } = await createDeclaration({
    studentId,
    academicYearId: academicYear.id,
    amount: req.body.amount,
    method: req.body.method,
    referenceNo: req.body.reference_no,
    note: req.body.note,
    proofImageId: parseId(req.body.proof_image_id),
  });

  if (error) {
    return sendError(res, error.status, error.message);
  }

  return sendCreated(res, declaration);
};



const listMyDeclarations = async (req, res) => {
  const studentId = req.user.profileId;

  if (!studentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No student profile is linked to this account.');
  }

  const [rows] = await pool.execute(
    `SELECT ${DECLARATION_SELECT} ${DECLARATION_JOINS}
     WHERE payment_declarations.student_id = ?
     ORDER BY payment_declarations.created_at DESC`,
    [studentId],
  );

  return sendOk(res, { declarations: toNumbers(rows) });
};




const listDeclarations = async (req, res) => {
  const status = ['pending', 'confirmed', 'rejected'].includes(req.query.status)
    ? req.query.status
    : null;

  const where = status ? 'WHERE payment_declarations.status = ?' : '';
  const params = status ? [status] : [];

  const [rows] = await pool.execute(
    `SELECT ${DECLARATION_SELECT} ${DECLARATION_JOINS} ${where}
     ORDER BY payment_declarations.created_at DESC
     LIMIT 100`,
    params,
  );

  const [[{ pending_count: pendingCount }]] = await pool.execute(
    "SELECT COUNT(*) AS pending_count FROM payment_declarations WHERE status = 'pending'",
  );

  return sendOk(res, { declarations: toNumbers(rows), pending_count: Number(pendingCount) });
};

const findDeclaration = async (declarationId) => {
  const [rows] = await pool.execute(
    `SELECT payment_declarations.*, students.user_id
     FROM payment_declarations
     JOIN students ON students.id = payment_declarations.student_id
     WHERE payment_declarations.id = ?`,
    [declarationId],
  );

  return rows[0] || null;
};




const confirmDeclaration = async (req, res) => {
  const cashierId = req.user.profileId;
  const declarationId = parseId(req.params.id);

  if (!cashierId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No cashier profile is linked to this account.');
  }

  if (!declarationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid declaration id.');
  }

  const declaration = await findDeclaration(declarationId);

  if (!declaration) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Declaration not found.');
  }

  if (declaration.status !== 'pending') {
    return sendError(res, HTTP_STATUS.CONFLICT, `This declaration is already ${declaration.status}.`);
  }




  const session = await findOpenSession(cashierId);

  if (!session) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Open a cashier session before confirming a payment.',
    );
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No school year is marked active.');
  }

  const account = await buildStudentAccount(declaration.student_id, academicYear.id);
  const amount = Number(declaration.amount);




  const allocations = Array.isArray(req.body && req.body.allocations) && req.body.allocations.length > 0
    ? req.body.allocations
    : spreadOverOldestCharges(account.charges, amount);

  const allocationError = checkAllocations(account, amount, allocations);

  if (allocationError) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, allocationError);
  }

  const recorded = await recordPayment({
    studentId: declaration.student_id,
    academicYear,
    cashierId,
    sessionId: session.id,
    amount,
    paymentType: amount === account.totals.balance ? 'full' : 'partial',
    method: declaration.method,
    referenceNo: declaration.reference_no,
    notes: `Confirmed from declaration #${declarationId}`,
    allocations,
    account,
  });

  await pool.execute(
    `UPDATE payment_declarations
     SET status = 'confirmed', payment_id = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
         review_remarks = ?
     WHERE id = ?`,
    [
      recorded.id,
      cashierId,
      req.body && req.body.review_remarks ? String(req.body.review_remarks).trim() : null,
      declarationId,
    ],
  );

  await notifyUser({
    userId: declaration.user_id,
    title: 'Payment confirmed',
    message: `Your payment of ${amount} is confirmed. Official receipt ${recorded.or_number}.`,
    type: 'payment',
  });

  logger.info(`Declaration ${declarationId} confirmed by cashier ${cashierId} as ${recorded.or_number}`);

  return sendOk(res, { declaration_id: declarationId, ...recorded });
};




const rejectDeclaration = async (req, res) => {
  const cashierId = req.user.profileId;
  const declarationId = parseId(req.params.id);

  if (!cashierId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No cashier profile is linked to this account.');
  }

  if (!declarationId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid declaration id.');
  }

  const remarks = req.body && req.body.review_remarks ? String(req.body.review_remarks).trim() : '';

  if (!remarks) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Say why it is being rejected.');
  }

  const declaration = await findDeclaration(declarationId);

  if (!declaration) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Declaration not found.');
  }

  if (declaration.status !== 'pending') {
    return sendError(res, HTTP_STATUS.CONFLICT, `This declaration is already ${declaration.status}.`);
  }

  await pool.execute(
    `UPDATE payment_declarations
     SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, review_remarks = ?
     WHERE id = ?`,
    [cashierId, remarks.slice(0, 255), declarationId],
  );

  await notifyUser({
    userId: declaration.user_id,
    title: 'Payment not confirmed',
    message: `Your declared payment of ${Number(declaration.amount)} was not confirmed: ${remarks}`,
    type: 'payment',
  });

  logger.info(`Declaration ${declarationId} rejected by cashier ${cashierId}`);

  return sendOk(res, { id: declarationId, status: 'rejected' });
};

module.exports = {
  createDeclaration,
  declarePayment,
  listMyDeclarations,
  listDeclarations,
  confirmDeclaration,
  rejectDeclaration,
};
