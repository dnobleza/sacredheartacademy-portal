-- Migration 007: bring admins table in line with teachers
--
-- admins was missing gender, address and updated_at, which teachers already
-- has. Adding these so the admins CRUD API can mirror the teachers API.

ALTER TABLE admins
  ADD COLUMN gender enum('male','female','other') DEFAULT NULL AFTER middle_name,
  ADD COLUMN address text AFTER gender,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
