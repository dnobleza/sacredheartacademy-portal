const PAD_WIDTH = 5;

const currentYear = () => new Date().getFullYear();




const buildSeries = (prefix, year, sequence) =>
  `${prefix}${year}-${String(sequence).padStart(PAD_WIDTH, '0')}`;




const nextInSeries = async (connection, { table, column, prefix, year = currentYear() }) => {
  const like = `${prefix}${year}-%`;

  const [rows] = await connection.execute(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(${column}, '-', -1) AS UNSIGNED)), 0) AS highest
     FROM ${table}
     WHERE ${column} LIKE ?`,
    [like],
  );

  return buildSeries(prefix, year, Number(rows[0].highest) + 1);
};




const nextOrNumber = (connection) =>
  nextInSeries(connection, { table: 'payments', column: 'or_number', prefix: 'OR-' });




const nextStudentNumber = (connection) =>
  nextInSeries(connection, { table: 'students', column: 'student_number', prefix: '' });

module.exports = {
  buildSeries,
  nextInSeries,
  nextOrNumber,
  nextStudentNumber,
};
