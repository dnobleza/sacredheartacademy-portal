-- Migration 016: add updated_at to announcements
--
-- announcements predates the created_at/updated_at convention used elsewhere
-- (see academic_years, grade_levels, sections). created_at already exists;
-- this only adds updated_at so edits to a posted announcement can be audited.
-- No uniqueness rule is needed: titles are not expected to be unique across
-- the feed.

ALTER TABLE announcements
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
