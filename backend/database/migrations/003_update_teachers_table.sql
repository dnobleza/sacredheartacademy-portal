-- Migration 003: extend the teachers table
--
-- Additive only. ALTER is used instead of DROP/CREATE so the inbound
-- foreign keys (class_subjects, teacher_subjects) survive.
-- Mirrors the students table conventions added in migration 002.

ALTER TABLE teachers
  ADD COLUMN gender ENUM('male', 'female', 'other') NULL AFTER middle_name,
  ADD COLUMN address TEXT NULL AFTER gender,
  ADD COLUMN contact_number VARCHAR(30) NULL AFTER address,
  ADD COLUMN updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
