const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendOk, sendError } = require('../../utils/send-response');

const getActiveAcademicYear = async () => {
  const [rows] = await pool.execute(
    `SELECT id, name, start_date, end_date
     FROM academic_years
     WHERE status = 'active'
     LIMIT 1`,
  );

  return rows.length > 0 ? rows[0] : null;
};


const getAdvisoryClasses = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       advisory_classes.id,
       advisory_classes.section_id,
       sections.name AS section_name,
       sections.room,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = advisory_classes.section_id
           AND enrollments.academic_year_id = advisory_classes.academic_year_id
           AND enrollments.status = 'active') AS student_count
     FROM advisory_classes
     JOIN sections ON sections.id = advisory_classes.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE advisory_classes.teacher_id = ? AND advisory_classes.academic_year_id = ?
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name`,
    [teacherId, academicYearId],
  );

  return rows;
};


const getSubjectClasses = async (teacherId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT
       class_subjects.id,
       class_subjects.section_id,
       subjects.name AS subject_name,
       subjects.code AS subject_code,
       sections.name AS section_name,
       sections.room,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = class_subjects.section_id
           AND enrollments.academic_year_id = class_subjects.academic_year_id
           AND enrollments.status = 'active') AS student_count
     FROM class_subjects
     JOIN sections ON sections.id = class_subjects.section_id
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     JOIN subjects ON subjects.id = class_subjects.subject_id
     WHERE class_subjects.teacher_id = ? AND class_subjects.academic_year_id = ?
     ORDER BY grade_levels.level_number IS NULL, grade_levels.level_number, sections.name, subjects.name`,
    [teacherId, academicYearId],
  );

  return rows;
};

const listClasses = async (req, res) => {
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return sendOk(res, { active_academic_year: null, advisory_classes: [], subject_classes: [] });
  }

  const [advisoryClasses, subjectClasses] = await Promise.all([
    getAdvisoryClasses(teacherId, activeAcademicYear.id),
    getSubjectClasses(teacherId, activeAcademicYear.id),
  ]);

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    advisory_classes: advisoryClasses,
    subject_classes: subjectClasses,
  });
};


const STUDENT_SELECT_FIELDS = `
  students.id,
  students.first_name,
  students.middle_name,
  students.last_name,
  students.gender,
  students.birth_date,
  students.contact_number,
  students.photo_id,
  users.email
`;




const findSectionStudents = async (sectionId, academicYearId) => {
  const [rows] = await pool.execute(
    `SELECT ${STUDENT_SELECT_FIELDS}
     FROM enrollments
     JOIN students ON students.id = enrollments.student_id
     LEFT JOIN users ON users.id = students.user_id
     WHERE enrollments.section_id = ?
       AND enrollments.academic_year_id = ?
       AND enrollments.status = 'active'
     ORDER BY students.last_name, students.first_name`,
    [sectionId, academicYearId],
  );

  return rows;
};







const attachGuardians = async (students) => {
  if (students.length === 0) {
    return students;
  }

  const placeholders = students.map(() => '?').join(', ');

  const [rows] = await pool.execute(
    `SELECT
       student_parents.student_id,
       parents.first_name,
       parents.last_name,
       parents.contact_number,
       student_parents.relationship,
       student_parents.is_primary_contact
     FROM student_parents
     JOIN parents ON parents.id = student_parents.parent_id
     WHERE student_parents.student_id IN (${placeholders})
     ORDER BY student_parents.is_primary_contact DESC, parents.last_name, parents.first_name`,
    students.map((student) => student.id),
  );

  const byStudent = rows.reduce((map, row) => {
    const { student_id: studentId, ...guardian } = row;
    map.set(studentId, [...(map.get(studentId) || []), guardian]);
    return map;
  }, new Map());

  return students.map((student) => ({
    ...student,
    guardians: byStudent.get(student.id) || [],
  }));
};

const teacherHandlesSection = async (teacherId, academicYearId, sectionId) => {
  const [rows] = await pool.execute(
    `SELECT 1 AS handled
     FROM advisory_classes
     WHERE advisory_classes.teacher_id = ?
       AND advisory_classes.academic_year_id = ?
       AND advisory_classes.section_id = ?
     UNION
     SELECT 1 AS handled
     FROM class_subjects
     WHERE class_subjects.teacher_id = ?
       AND class_subjects.academic_year_id = ?
       AND class_subjects.section_id = ?
     LIMIT 1`,
    [teacherId, academicYearId, sectionId, teacherId, academicYearId, sectionId],
  );

  return rows.length > 0;
};

const getSectionRoster = async (req, res) => {
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const sectionId = Number(req.params.sectionId);

  if (!Number.isInteger(sectionId) || sectionId < 1) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Invalid section id.');
  }

  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'There is no active school year.');
  }

  const handled = await teacherHandlesSection(teacherId, activeAcademicYear.id, sectionId);

  if (!handled) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'You do not handle this section.');
  }

  
  
  const students = await attachGuardians(
    await findSectionStudents(sectionId, activeAcademicYear.id),
  );

  return sendOk(res, { students });
};




const listAdvisoryStudents = async (req, res) => {
  const teacherId = req.user.profileId;

  if (!teacherId) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, 'No teacher profile is linked to this account.');
  }

  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return sendOk(res, { active_academic_year: null, advisory_classes: [] });
  }

  const advisoryClasses = await getAdvisoryClasses(teacherId, activeAcademicYear.id);



  const withStudents = await Promise.all(
    advisoryClasses.map(async (advisoryClass) => ({
      ...advisoryClass,
      students: await attachGuardians(
        await findSectionStudents(advisoryClass.section_id, activeAcademicYear.id),
      ),
    })),
  );

  return sendOk(res, {
    active_academic_year: activeAcademicYear,
    advisory_classes: withStudents,
  });
};

module.exports = {
  listClasses,
  listAdvisoryStudents,
  getSectionRoster,
};
