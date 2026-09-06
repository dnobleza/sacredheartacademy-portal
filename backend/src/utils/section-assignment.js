const pool = require('../config/database');




const SECTION_HEADCOUNT_QUERY = `
  SELECT
    sections.id,
    sections.name,
    sections.capacity,
    grade_levels.name AS grade_level_name,
    (SELECT COUNT(*)
       FROM enrollments
      WHERE enrollments.section_id = sections.id
        AND enrollments.academic_year_id = ?
        AND enrollments.status = 'active') AS student_count
  FROM sections
  JOIN grade_levels ON grade_levels.id = sections.grade_level_id
  WHERE sections.grade_level_id = ?
  ORDER BY sections.name`;




const findOpenSection = async (executor, { gradeLevelId, academicYearId }) => {
  const [rows] = await executor.execute(SECTION_HEADCOUNT_QUERY, [academicYearId, gradeLevelId]);

  if (rows.length === 0) {
    return { section: null, reason: 'no_sections' };
  }

  const open = rows.find((row) => Number(row.student_count) < Number(row.capacity));

  return open ? { section: open, reason: null } : { section: null, reason: 'all_sections_full' };
};




const getSectionHeadcounts = async (gradeLevelId, academicYearId) => {
  const [rows] = await pool.execute(SECTION_HEADCOUNT_QUERY, [academicYearId, gradeLevelId]);

  return rows;
};

const findSectionWithHeadcount = async (executor, { sectionId, academicYearId }) => {
  const [rows] = await executor.execute(
    `SELECT
       sections.id,
       sections.name,
       sections.capacity,
       sections.grade_level_id,
       grade_levels.name AS grade_level_name,
       (SELECT COUNT(*)
          FROM enrollments
         WHERE enrollments.section_id = sections.id
           AND enrollments.academic_year_id = ?
           AND enrollments.status = 'active') AS student_count
     FROM sections
     JOIN grade_levels ON grade_levels.id = sections.grade_level_id
     WHERE sections.id = ?`,
    [academicYearId, sectionId],
  );

  return rows[0] || null;
};

module.exports = {
  findOpenSection,
  getSectionHeadcounts,
  findSectionWithHeadcount,
};
