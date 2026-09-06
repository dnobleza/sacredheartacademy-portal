const pool = require('../config/database');
const { nextStudentNumber } = require('./reference-numbers');




const applyFeeSchedule = async (connection, { studentId, academicYearId, gradeLevelId }) => {
  const [result] = await connection.execute(
    `INSERT INTO student_charges (student_id, academic_year_id, fee_id, amount)
     SELECT ?, fee_schedules.academic_year_id, fee_schedules.fee_id, fee_schedules.amount
     FROM fee_schedules
     JOIN fees ON fees.id = fee_schedules.fee_id
     WHERE fee_schedules.academic_year_id = ?
       AND fee_schedules.grade_level_id = ?
       AND fees.is_active = 1
     ON DUPLICATE KEY UPDATE student_charges.id = student_charges.id`,
    [studentId, academicYearId, gradeLevelId],
  );

  return result.affectedRows;
};




const assignStudentNumber = async (connection, studentId) => {
  const [rows] = await connection.execute(
    'SELECT student_number FROM students WHERE id = ?',
    [studentId],
  );

  if (rows.length === 0 || rows[0].student_number) {
    return rows[0] ? rows[0].student_number : null;
  }

  const studentNumber = await nextStudentNumber(connection);

  await connection.execute('UPDATE students SET student_number = ? WHERE id = ?', [
    studentNumber,
    studentId,
  ]);

  return studentNumber;
};




const ACCOUNT_TOTALS_SQL = `
  SELECT
    (SELECT COALESCE(SUM(amount), 0) FROM student_charges
      WHERE student_id = ? AND academic_year_id = ?) AS total_charges,
    (SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE student_id = ? AND academic_year_id = ?) AS total_paid`;




const buildStudentAccount = async (studentId, academicYearId, executor = pool) => {
  const [[student]] = await executor.execute(
    `SELECT
       students.id,
       students.student_number,
       students.first_name,
       students.middle_name,
       students.last_name,
       users.email,
       sections.name AS section_name,
       grade_levels.name AS grade_level_name,
       grade_levels.id AS grade_level_id
     FROM students
     LEFT JOIN users ON users.id = students.user_id
     LEFT JOIN enrollments
            ON enrollments.student_id = students.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active'
     LEFT JOIN sections ON sections.id = enrollments.section_id
     LEFT JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE students.id = ?`,
    [academicYearId, studentId],
  );

  if (!student) {
    return null;
  }

  const [charges] = await executor.execute(
    `SELECT student_charges.id, student_charges.fee_id, fees.name AS fee_name, student_charges.amount
     FROM student_charges
     JOIN fees ON fees.id = student_charges.fee_id
     WHERE student_charges.student_id = ? AND student_charges.academic_year_id = ?
     ORDER BY fees.id`,
    [studentId, academicYearId],
  );

  const [payments] = await executor.execute(
    `SELECT id, or_number, amount, payment_type, method, reference_no, paid_at
     FROM payments
     WHERE student_id = ? AND academic_year_id = ?
     ORDER BY paid_at DESC, id DESC`,
    [studentId, academicYearId],
  );



  const [paidByFee] = await executor.execute(
    `SELECT payment_items.fee_id, COALESCE(SUM(payment_items.amount), 0) AS paid
     FROM payment_items
     JOIN payments ON payments.id = payment_items.payment_id
     WHERE payments.student_id = ? AND payments.academic_year_id = ?
     GROUP BY payment_items.fee_id`,
    [studentId, academicYearId],
  );

  const paidPerFee = new Map(paidByFee.map((row) => [row.fee_id, Number(row.paid)]));

  const [[totals]] = await executor.execute(ACCOUNT_TOTALS_SQL, [
    studentId,
    academicYearId,
    studentId,
    academicYearId,
  ]);

  const totalCharges = Number(totals.total_charges);
  const totalPaid = Number(totals.total_paid);

  return {
    student,
    charges: charges.map((charge) => {
      const paid = paidPerFee.get(charge.fee_id) || 0;

      return {
        ...charge,
        amount: Number(charge.amount),
        paid,
        balance: Math.round((Number(charge.amount) - paid) * 100) / 100,
      };
    }),
    payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
    totals: {
      total_charges: totalCharges,
      total_paid: totalPaid,
      balance: Math.round((totalCharges - totalPaid) * 100) / 100,
    },
  };
};



const getDownpaymentRequirement = async (studentId, academicYearId, executor = pool) => {




  const [rows] = await executor.execute(
    `SELECT
       COALESCE((
         SELECT enrollment_downpayments.percentage
         FROM enrollment_downpayments
         JOIN admission_applications
           ON admission_applications.grade_level_id = enrollment_downpayments.grade_level_id
         WHERE admission_applications.student_id = ?
           AND enrollment_downpayments.academic_year_id = ?
         ORDER BY admission_applications.id DESC
         LIMIT 1
       ), 0) AS percentage,
       COALESCE((
         SELECT SUM(amount) FROM student_charges
         WHERE student_id = ? AND academic_year_id = ?
       ), 0) AS total_charges,
       COALESCE((
         SELECT SUM(amount) FROM payments
         WHERE student_id = ? AND academic_year_id = ?
       ), 0) AS paid`,
    [studentId, academicYearId, studentId, academicYearId, studentId, academicYearId],
  );

  const percentage = Number(rows[0].percentage);
  const totalCharges = Number(rows[0].total_charges);
  const paid = Number(rows[0].paid);




  const required = Math.round((totalCharges * percentage) / 100 * 100) / 100;

  return {
    percentage,
    total_charges: totalCharges,
    required,
    paid,
    remaining: Math.max(0, Math.round((required - paid) * 100) / 100),


    satisfied: paid >= required,
  };
};

const getActiveAcademicYear = async (executor = pool) => {
  const [rows] = await executor.execute(
    "SELECT id, name, start_date, end_date FROM academic_years WHERE status = 'active' LIMIT 1",
  );

  return rows[0] || null;
};

module.exports = {
  applyFeeSchedule,
  getDownpaymentRequirement,
  assignStudentNumber,
  buildStudentAccount,
  getActiveAcademicYear,
};
