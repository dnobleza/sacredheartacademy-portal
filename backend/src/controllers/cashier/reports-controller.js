const pool = require('../../config/database');
const { sendOk } = require('../../utils/send-response');
const { getActiveAcademicYear } = require('../../utils/billing');




const BY_METHOD_SQL = `
  SELECT method, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS transactions
  FROM payments
  WHERE %WHERE%
  GROUP BY method
  ORDER BY total DESC`;

const BY_FEE_SQL = `
  SELECT fees.id AS fee_id, fees.name AS fee_name, COALESCE(SUM(payment_items.amount), 0) AS total
  FROM payment_items
  JOIN payments ON payments.id = payment_items.payment_id
  JOIN fees ON fees.id = payment_items.fee_id
  WHERE %WHERE%
  GROUP BY fees.id, fees.name
  ORDER BY fees.id`;

const toNumbers = (rows, keys) =>
  rows.map((row) => {
    const copy = { ...row };
    keys.forEach((key) => {
      copy[key] = Number(copy[key]);
    });
    return copy;
  });




const dailyReport = async (req, res) => {
  const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : null;
  const where = 'DATE(payments.paid_at) = COALESCE(?, CURDATE())';

  const [[totals]] = await pool.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS transactions
     FROM payments WHERE ${where.replace('payments.paid_at', 'paid_at')}`,
    [date],
  );

  const [byMethod] = await pool.execute(
    BY_METHOD_SQL.replace('%WHERE%', where.replace('payments.paid_at', 'paid_at')),
    [date],
  );

  const [byFee] = await pool.execute(BY_FEE_SQL.replace('%WHERE%', where), [date]);

  const [transactions] = await pool.execute(
    `SELECT payments.id, payments.or_number, payments.amount, payments.method, payments.paid_at,
            students.student_number, students.first_name, students.last_name
     FROM payments
     JOIN students ON students.id = payments.student_id
     WHERE ${where}
     ORDER BY payments.paid_at DESC, payments.id DESC`,
    [date],
  );

  return sendOk(res, {
    date: date || new Date().toISOString().slice(0, 10),
    totals: { total: Number(totals.total), transactions: Number(totals.transactions) },
    by_method: toNumbers(byMethod, ['total', 'transactions']),
    by_fee: toNumbers(byFee, ['total']),
    transactions: toNumbers(transactions, ['amount']),
  });
};




const monthlyReport = async (req, res) => {
  const month = typeof req.query.month === 'string' && req.query.month ? `${req.query.month}-01` : null;
  const where = "DATE_FORMAT(payments.paid_at, '%Y-%m') = DATE_FORMAT(COALESCE(?, CURDATE()), '%Y-%m')";
  const plain = where.replace('payments.paid_at', 'paid_at');

  const [[totals]] = await pool.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS transactions
     FROM payments WHERE ${plain}`,
    [month],
  );

  const [byDay] = await pool.execute(
    `SELECT DATE(paid_at) AS day, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS transactions
     FROM payments WHERE ${plain}
     GROUP BY DATE(paid_at)
     ORDER BY day`,
    [month],
  );

  const [byMethod] = await pool.execute(BY_METHOD_SQL.replace('%WHERE%', plain), [month]);
  const [byFee] = await pool.execute(BY_FEE_SQL.replace('%WHERE%', where), [month]);

  return sendOk(res, {
    month: (month || new Date().toISOString().slice(0, 10)).slice(0, 7),
    totals: { total: Number(totals.total), transactions: Number(totals.transactions) },
    by_day: toNumbers(byDay, ['total', 'transactions']),
    by_method: toNumbers(byMethod, ['total', 'transactions']),
    by_fee: toNumbers(byFee, ['total']),
  });
};




const collectionSummary = async (req, res) => {
  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, { active_academic_year: null, totals: null, by_fee: [], by_grade_level: [] });
  }

  const yearId = academicYear.id;

  const [[totals]] = await pool.execute(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM student_charges WHERE academic_year_id = ?) AS charged,
       (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE academic_year_id = ?) AS collected`,
    [yearId, yearId],
  );

  const [byFee] = await pool.execute(
    `SELECT
       fees.id AS fee_id,
       fees.name AS fee_name,
       COALESCE((SELECT SUM(amount) FROM student_charges
                  WHERE fee_id = fees.id AND academic_year_id = ?), 0) AS charged,
       COALESCE((SELECT SUM(payment_items.amount) FROM payment_items
                  JOIN payments ON payments.id = payment_items.payment_id
                 WHERE payment_items.fee_id = fees.id AND payments.academic_year_id = ?), 0) AS collected
     FROM fees
     ORDER BY fees.id`,
    [yearId, yearId],
  );

  const [byGradeLevel] = await pool.execute(
    `SELECT
       grade_levels.id AS grade_level_id,
       grade_levels.name AS grade_level_name,
       COALESCE(SUM(payments.amount), 0) AS collected
     FROM grade_levels
     LEFT JOIN sections ON sections.grade_level_id = grade_levels.id
     LEFT JOIN enrollments
            ON enrollments.section_id = sections.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active'
     LEFT JOIN payments
            ON payments.student_id = enrollments.student_id
           AND payments.academic_year_id = ?
     GROUP BY grade_levels.id, grade_levels.name
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number`,
    [yearId, yearId],
  );

  const charged = Number(totals.charged);
  const collected = Number(totals.collected);

  return sendOk(res, {
    active_academic_year: academicYear,
    totals: {
      charged,
      collected,
      outstanding: Math.round((charged - collected) * 100) / 100,
    },
    by_fee: toNumbers(byFee, ['charged', 'collected']),
    by_grade_level: toNumbers(byGradeLevel, ['collected']),
  });
};

module.exports = {
  dailyReport,
  monthlyReport,
  collectionSummary,
};
