const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { buildStudentAccount, getActiveAcademicYear } = require('../../utils/billing');




const getMyAccount = async (req, res) => {
  const studentId = req.user.profileId;

  if (!studentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No student profile is linked to this account.');
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, { academic_year: null, account: null });
  }

  const account = await buildStudentAccount(studentId, academicYear.id);

  return sendOk(res, { academic_year: academicYear, account });
};




const listChildren = async (req, res) => {
  const parentId = req.user.profileId;

  if (!parentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No parent profile is linked to this account.');
  }

  const [rows] = await pool.execute(
    `SELECT
       students.id,
       students.student_number,
       students.first_name,
       students.middle_name,
       students.last_name,
       student_parents.relationship
     FROM student_parents
     JOIN students ON students.id = student_parents.student_id
     WHERE student_parents.parent_id = ?
     ORDER BY students.last_name, students.first_name`,
    [parentId],
  );

  return sendOk(res, { children: rows });
};




const parentOwnsStudent = async (parentId, studentId) => {
  const [rows] = await pool.execute(
    'SELECT 1 AS linked FROM student_parents WHERE parent_id = ? AND student_id = ? LIMIT 1',
    [parentId, studentId],
  );

  return rows.length > 0;
};

const getChildAccount = async (req, res) => {
  const parentId = req.user.profileId;

  if (!parentId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No parent profile is linked to this account.');
  }

  const studentId = Number(req.params.studentId);

  if (!Number.isInteger(studentId) || studentId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid student id.');
  }




  if (!(await parentOwnsStudent(parentId, studentId))) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'That is not your child.');
  }

  const academicYear = await getActiveAcademicYear();

  if (!academicYear) {
    return sendOk(res, { academic_year: null, account: null });
  }

  const account = await buildStudentAccount(studentId, academicYear.id);

  if (!account) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found.');
  }

  return sendOk(res, { academic_year: academicYear, account });
};

module.exports = {
  getMyAccount,
  listChildren,
  getChildAccount,
};
