const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { buildStudentAccount, getActiveAcademicYear } = require('../../utils/billing');
const { findOpenSession } = require('./payments-controller');
const { validatePagination } = require('../../validations/student-validation');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};




const OUTSTANDING_SQL = `
  SELECT
    students.id AS student_id,
    students.student_number,
    students.first_name,
    students.last_name,
    grade_levels.name AS grade_level_name,
    sections.name AS section_name,
    COALESCE(charges.total, 0) AS total_charges,
    COALESCE(paid.total, 0) AS total_paid,
    COALESCE(charges.total, 0) - COALESCE(paid.total, 0) AS balance
  FROM students
  LEFT JOIN enrollments
         ON enrollments.student_id = students.id
        AND enrollments.academic_year_id = ?
        AND enrollments.status = 'active'
  LEFT JOIN sections ON sections.id = enrollments.section_id
  LEFT JOIN grade_levels ON grade_levels.id = sections.grade_level_id
  LEFT JOIN (
    SELECT student_id, SUM(amount) AS total
    FROM student_charges WHERE academic_year_id = ? GROUP BY student_id
  ) AS charges ON charges.student_id = students.id
  LEFT JOIN (
    SELECT student_id, SUM(amount) AS total
    FROM payments WHERE academic_year_id = ? GROUP BY student_id
  ) AS paid ON paid.student_id = students.id
`;

const getDashboard = async (req, res) => {
  const cashierId = req.user.profileId;
  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, {
      active_academic_year: null,
      counts: { today_collection: 0, month_collection: 0, outstanding_balance: 0, transactions_today: 0 },
      today_transactions: [],
      collection_summary: [],
      open_session: null,
    });
  }

  const yearId = academicYear.id;

  const [[totals]] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN DATE(paid_at) = CURDATE() THEN amount END), 0) AS today_collection,
       COALESCE(SUM(CASE WHEN YEAR(paid_at) = YEAR(CURDATE())
                          AND MONTH(paid_at) = MONTH(CURDATE()) THEN amount END), 0) AS month_collection,
       COUNT(CASE WHEN DATE(paid_at) = CURDATE() THEN 1 END) AS transactions_today
     FROM payments
     WHERE academic_year_id = ?`,
    [yearId],
  );

  const [[outstanding]] = await pool.execute(
    `SELECT COALESCE(SUM(charges.total), 0) - COALESCE(SUM(paid.total), 0) AS outstanding
     FROM (SELECT student_id, SUM(amount) AS total FROM student_charges
            WHERE academic_year_id = ? GROUP BY student_id) AS charges
     LEFT JOIN (SELECT student_id, SUM(amount) AS total FROM payments
                 WHERE academic_year_id = ? GROUP BY student_id) AS paid
            ON paid.student_id = charges.student_id`,
    [yearId, yearId],
  );

  const [todayTransactions] = await pool.execute(
    `SELECT
       payments.id,
       payments.or_number,
       payments.amount,
       payments.payment_type,
       payments.method,
       payments.paid_at,
       students.student_number,
       students.first_name,
       students.last_name
     FROM payments
     JOIN students ON students.id = payments.student_id
     WHERE DATE(payments.paid_at) = CURDATE()
     ORDER BY payments.paid_at DESC, payments.id DESC
     LIMIT 10`,
  );



  const [collectionSummary] = await pool.execute(
    `SELECT fees.id AS fee_id, fees.name AS fee_name, COALESCE(SUM(payment_items.amount), 0) AS total
     FROM payment_items
     JOIN payments ON payments.id = payment_items.payment_id
     JOIN fees ON fees.id = payment_items.fee_id
     WHERE DATE(payments.paid_at) = CURDATE()
     GROUP BY fees.id, fees.name
     ORDER BY fees.id`,
  );

  return sendOk(res, {
    active_academic_year: academicYear,
    counts: {
      today_collection: Number(totals.today_collection),
      month_collection: Number(totals.month_collection),
      outstanding_balance: Number(outstanding.outstanding),
      transactions_today: Number(totals.transactions_today),
    },
    today_transactions: todayTransactions.map((row) => ({ ...row, amount: Number(row.amount) })),
    collection_summary: collectionSummary.map((row) => ({ ...row, total: Number(row.total) })),
    open_session: cashierId ? await findOpenSession(cashierId) : null,
  });
};




const searchStudents = async (req, res) => {
  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, { active_academic_year: null, students: [] });
  }

  const term = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (term.length < 2) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Type at least two characters to search.');
  }

  const like = `%${term}%`;

  const [rows] = await pool.execute(
    `${OUTSTANDING_SQL}
     LEFT JOIN users ON users.id = students.user_id
     WHERE students.student_number LIKE ?
        OR users.email LIKE ?
        OR CONCAT_WS(' ', students.first_name, students.last_name) LIKE ?
     ORDER BY students.last_name, students.first_name
     LIMIT 20`,
    [academicYear.id, academicYear.id, academicYear.id, like, like, like],
  );

  return sendOk(res, {
    active_academic_year: academicYear,
    students: rows.map((row) => ({
      ...row,
      total_charges: Number(row.total_charges),
      total_paid: Number(row.total_paid),
      balance: Number(row.balance),
    })),
  });
};




const getStudentAccount = async (req, res) => {
  const studentId = parseId(req.params.id);

  if (!studentId) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid student id.');
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'No school year is marked active.');
  }

  const account = await buildStudentAccount(studentId, academicYear.id);

  if (!account) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  return sendOk(res, { ...account, academic_year: academicYear });
};




const listOutstanding = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, {
      active_academic_year: null,
      students: [],
      pagination: { page, limit, total: 0, pages: 0 },
    });
  }

  const yearParams = [academicYear.id, academicYear.id, academicYear.id];
  const searchClause = search
    ? "AND (students.student_number LIKE ? OR CONCAT_WS(' ', students.first_name, students.last_name) LIKE ?)"
    : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

  const [rows] = await pool.execute(
    `${OUTSTANDING_SQL}
     WHERE COALESCE(charges.total, 0) - COALESCE(paid.total, 0) > 0 ${searchClause}
     ORDER BY balance DESC, students.last_name
     LIMIT ${limit} OFFSET ${offset}`,
    [...yearParams, ...searchParams],
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM (${OUTSTANDING_SQL}
       WHERE COALESCE(charges.total, 0) - COALESCE(paid.total, 0) > 0 ${searchClause}) AS owing`,
    [...yearParams, ...searchParams],
  );

  return sendOk(res, {
    active_academic_year: academicYear,
    students: rows.map((row) => ({
      ...row,
      total_charges: Number(row.total_charges),
      total_paid: Number(row.total_paid),
      balance: Number(row.balance),
    })),
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  });
};

module.exports = {
  getDashboard,
  searchStudents,
  getStudentAccount,
  listOutstanding,
};
