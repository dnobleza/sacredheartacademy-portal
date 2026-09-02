-- Migration 002: restructure the students table
--
-- Applied while students held 0 rows, so no data was lost.
-- ALTER is used instead of DROP/CREATE so the five inbound foreign keys
-- (attendance, enrollments, grades, submissions, student_parents) survive.
--
-- BREAKING: student_number is removed. Students are now identified by
-- users.email only. CLAUDE.md sections 8, 11 and 28 still reference
-- student_number and need updating to match.

ALTER TABLE students
  DROP COLUMN student_number,
  CHANGE COLUMN date_of_birth birth_date DATE NULL,
  MODIFY COLUMN middle_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN address TEXT NULL AFTER gender,
  ADD COLUMN contact_number VARCHAR(30) NULL AFTER address,
  ADD COLUMN updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
