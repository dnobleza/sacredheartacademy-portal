const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { toAmount } = require('../../utils/money');
const { nextOrNumber } = require('../../utils/reference-numbers');
const {
  buildStudentAccount,
  getActiveAcademicYear,
  getDownpaymentRequirement,
} = require('../../utils/billing');
const { notifyAccessLevel } = require('../../utils/notifications');
const { ACCESS_LEVEL_IDS } = require('../../utils/access-levels');
const { validatePagination } = require('../../validations/student-validation');
const { validateCreatePayment } = require('../../validations/payment-validation');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const PAYMENT_SELECT = `
  payments.id,
  payments.or_number,
  payments.amount,
  payments.payment_type,
  payments.method,
  payments.reference_no,
  payments.notes,
  payments.paid_at,
  payments.student_id,
  students.student_number,
  students.first_name,
  students.last_name,
  CONCAT_WS(' ', cashiers.first_name, cashiers.last_name) AS cashier_name
`;

const PAYMENT_JOINS = `
  FROM payments
  JOIN students ON students.id = payments.student_id
  LEFT JOIN admins AS cashiers ON cashiers.id = payments.cashier_id
`;




const findOpenSession = async (cashierId, executor = pool) => {
  const [rows] = await executor.execute(
    "SELECT id, opening_cash, opened_at FROM cashier_sessions WHERE cashier_id = ? AND status = 'open' LIMIT 1",
    [cashierId],
  );

  return rows[0] || null;
};




const recordPayment = async ({
  studentId,
  academicYear,
  cashierId,
  sessionId,
  amount,
  paymentType,
  method,
  referenceNo,
  notes,
  allocations,
  account,
}) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const orNumber = await nextOrNumber(connection);

    const [result] = await connection.execute(
      `INSERT INTO payments
        (or_number, student_id, academic_year_id, cashier_id, session_id, amount, payment_type,
         method, reference_no, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orNumber,
        studentId,
        academicYear.id,
        cashierId,
        sessionId,
        amount,
        paymentType,
        method,
        referenceNo || null,
        notes || null,
      ],
    );

    await Promise.all(
      allocations.map((allocation) =>
        connection.execute(
          'INSERT INTO payment_items (payment_id, fee_id, amount) VALUES (?, ?, ?)',
          [result.insertId, Number(allocation.fee_id), toAmount(allocation.amount)],
        ),
      ),
    );

    await connection.commit();

    logger.info(`Payment ${orNumber} recorded by cashier ${cashierId} for student ${studentId}`);




    const downpayment = await getDownpaymentRequirement(studentId, academicYear.id);
    const clearedNow = downpayment.satisfied && downpayment.required > 0
      && downpayment.paid - amount < downpayment.required;

    if (clearedNow) {
      
      
      await notifyAccessLevel({
        accessLevelId: ACCESS_LEVEL_IDS.REGISTRAR,
        title: 'Downpayment settled',
        message: `${account.student.first_name} ${account.student.last_name} has paid the downpayment and is ready to enroll.`,
        type: 'admission',
      });
    }

    return {
      id: result.insertId,
      or_number: orNumber,
      amount,
      payment_type: paymentType,
      method,
      student: account.student,
      balance_after: Math.round((account.totals.balance - amount) * 100) / 100,
      downpayment_cleared: clearedNow,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};




const spreadOverOldestCharges = (charges, amount) => {
  let remaining = amount;

  return charges
    .filter((charge) => charge.balance > 0)
    .map((charge) => {
      if (remaining <= 0) {
        return null;
      }

      const take = Math.min(charge.balance, remaining);
      remaining = Math.round((remaining - take) * 100) / 100;

      return { fee_id: charge.fee_id, amount: take };
    })
    .filter(Boolean);
};




const checkAllocations = (account, amount, allocations) => {
  const balanceByFee = new Map(account.charges.map((charge) => [charge.fee_id, charge.balance]));

  const overAllocated = allocations.find((allocation) => {
    const remaining = balanceByFee.get(Number(allocation.fee_id));
    return remaining === undefined || toAmount(allocation.amount) > remaining;
  });

  if (overAllocated) {
    return 'One of the fees is not charged to this student, or the amount exceeds what is left on it.';
  }

  if (amount > account.totals.balance) {
    return `That is more than the outstanding balance of ${account.totals.balance}.`;
  }

  return null;
};




const createPayment = async (req, res) => {
  const cashierId = req.user.profileId;

  if (!cashierId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No cashier profile is linked to this account.');
  }

  const validationErrors = validateCreatePayment(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No school year is marked active.');
  }




  const session = await findOpenSession(cashierId);

  if (!session) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Open a cashier session before recording a payment.',
    );
  }

  const studentId = Number(req.body.student_id);
  const account = await buildStudentAccount(studentId, academicYear.id);

  if (!account) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  const amount = toAmount(req.body.amount);
  const paymentType = req.body.payment_type === 'full' ? 'full' : 'partial';

  const allocationError = checkAllocations(account, amount, req.body.allocations);

  if (allocationError) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, allocationError);
  }



  if (paymentType === 'full' && amount !== account.totals.balance) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `A full payment must settle the whole balance of ${account.totals.balance}.`,
    );
  }

  const recorded = await recordPayment({
    studentId,
    academicYear,
    cashierId,
    sessionId: session.id,
    amount,
    paymentType,
    method: req.body.method,
    referenceNo: req.body.reference_no ? String(req.body.reference_no).trim() : null,
    notes: req.body.notes ? String(req.body.notes).trim() : null,
    allocations: req.body.allocations,
    account,
  });

  return sendCreated(res, recorded);
};




const listPayments = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (req.query.from) {
    conditions.push('DATE(payments.paid_at) >= ?');
    params.push(req.query.from);
  }

  if (req.query.to) {
    conditions.push('DATE(payments.paid_at) <= ?');
    params.push(req.query.to);
  }

  if (req.query.method) {
    conditions.push('payments.method = ?');
    params.push(req.query.method);
  }

  if (req.query.payment_type) {
    conditions.push('payments.payment_type = ?');
    params.push(req.query.payment_type);
  }

  if (req.query.student_id) {
    conditions.push('payments.student_id = ?');
    params.push(Number(req.query.student_id));
  }

  if (search) {
    conditions.push(`(
      payments.or_number LIKE ?
      OR students.student_number LIKE ?
      OR students.first_name LIKE ?
      OR students.last_name LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.execute(
    `SELECT ${PAYMENT_SELECT} ${PAYMENT_JOINS} ${where}
     ORDER BY payments.paid_at DESC, payments.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total ${PAYMENT_JOINS} ${where}`,
    params,
  );

  return sendOk(res, {
    payments: rows.map((row) => ({ ...row, amount: Number(row.amount) })),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};




const getPaymentById = async (req, res) => {
  const paymentId = parseId(req.params.id);

  if (!paymentId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid payment id.');
  }

  const [rows] = await pool.execute(
    `SELECT ${PAYMENT_SELECT}, payments.academic_year_id, academic_years.name AS academic_year_name
     ${PAYMENT_JOINS}
     LEFT JOIN academic_years ON academic_years.id = payments.academic_year_id
     WHERE payments.id = ?`,
    [paymentId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Payment not found.');
  }

  const [items] = await pool.execute(
    `SELECT payment_items.fee_id, fees.name AS fee_name, payment_items.amount
     FROM payment_items
     JOIN fees ON fees.id = payment_items.fee_id
     WHERE payment_items.payment_id = ?
     ORDER BY fees.id`,
    [paymentId],
  );

  return sendOk(res, {
    ...rows[0],
    amount: Number(rows[0].amount),
    items: items.map((item) => ({ ...item, amount: Number(item.amount) })),
  });
};

module.exports = {
  createPayment,
  recordPayment,
  spreadOverOldestCharges,
  checkAllocations,
  listPayments,
  getPaymentById,
  findOpenSession,
};
