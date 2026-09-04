-- Migration 013: add timestamps to subjects and seed the core subject set
--
-- subjects predates the created_at/updated_at convention used elsewhere (see
-- academic_years, grade_levels, sections), which the list endpoint reports and
-- audits by. No uniqueness constraint is added here: subjects already carries
-- UNIQUE(code), and the name is deliberately left non-unique so "English" can
-- exist under both ENG7 and ENG10.
--
-- The table is empty, so this also seeds the subjects the school actually
-- teaches. Codes are stored uppercase; the API uppercases them on write so
-- 'eng' and 'ENG' cannot become two rows.

ALTER TABLE subjects
  ADD COLUMN created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

INSERT INTO subjects (code, name, description) VALUES
  ('ENG', 'English', NULL),
  ('MATH', 'Mathematics', NULL),
  ('SCI', 'Science', NULL),
  ('FIL', 'Filipino', NULL),
  ('AP', 'Araling Panlipunan', NULL),
  ('MAPEH', 'MAPEH', 'Music, Arts, Physical Education and Health'),
  ('ESP', 'Edukasyon sa Pagpapakatao', NULL),
  ('TLE', 'Technology and Livelihood Education', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);
