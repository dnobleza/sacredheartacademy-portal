-- Migration 004: extend the parents table
--
-- Additive only. ALTER is used instead of DROP/CREATE so the inbound
-- foreign key (student_parents) survives.
-- Mirrors the columns added to students in 002 and to teachers in 003.

ALTER TABLE parents
  ADD COLUMN gender ENUM('male', 'female', 'other') NULL AFTER middle_name,
  ADD COLUMN address TEXT NULL AFTER gender,
  ADD COLUMN updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
