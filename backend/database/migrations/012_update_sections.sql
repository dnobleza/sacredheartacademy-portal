-- Migration 012: add timestamps, a per-grade-level name uniqueness
-- constraint, and seed sections
--
-- sections predates the created_at/updated_at convention used elsewhere
-- (see academic_years, grade_levels) and had no protection against two
-- sections sharing a name within the same grade level. Both gaps matter
-- once the admin CRUD API goes live: the list endpoint orders/audits by
-- these columns, and duplicate names within a grade level would make the
-- section picker on the frontend ambiguous. The uniqueness constraint is
-- scoped to (grade_level_id, name) rather than name alone, since "Section A"
-- legitimately exists under every grade level. The table is currently
-- empty, so this also seeds one sample section per grade level.
--
-- grade_level_id is resolved via subquery on grade_levels.name rather than
-- hardcoded, since the live database's grade level ids are 2-6 (an earlier
-- test row consumed id 1), not 1-5.

ALTER TABLE sections
  ADD COLUMN created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY grade_level_name (grade_level_id, name);

INSERT INTO sections (grade_level_id, name, room) VALUES
  ((SELECT id FROM grade_levels WHERE name = 'Nursery'), 'Section A', 'Room 101'),
  ((SELECT id FROM grade_levels WHERE name = 'Kindergarten'), 'Section A', 'Room 102'),
  ((SELECT id FROM grade_levels WHERE name = 'Elementary'), 'Section A', 'Room 201'),
  ((SELECT id FROM grade_levels WHERE name = 'Junior High School'), 'Section A', 'Room 301'),
  ((SELECT id FROM grade_levels WHERE name = 'Senior High School'), 'Section A', 'Room 401')
ON DUPLICATE KEY UPDATE room = VALUES(room);
