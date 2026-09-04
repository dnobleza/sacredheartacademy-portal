-- Migration 011: add timestamps, a name uniqueness constraint, and seed
-- grade_levels
--
-- grade_levels predates the created_at/updated_at convention used elsewhere
-- (see academic_years, teachers, students, parents) and had no protection
-- against two rows sharing a name. Both gaps matter once the admin CRUD API
-- goes live: the list endpoint orders/audits by these columns, and duplicate
-- names would make the section/grade level picker on the frontend ambiguous.
-- The table is currently empty, so this also seeds the five levels the
-- school actually runs, ordered by level_number.

ALTER TABLE grade_levels
  ADD COLUMN created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY name (name);

INSERT INTO grade_levels (name, level_number) VALUES
  ('Nursery', 1),
  ('Kindergarten', 2),
  ('Elementary', 3),
  ('Junior High School', 4),
  ('Senior High School', 5)
ON DUPLICATE KEY UPDATE level_number = VALUES(level_number);
