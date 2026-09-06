-- Migration 021: enrollment application flow
--
-- Turns admissions from a one-way decision into the school's actual process:
-- an applicant declares a school year and an enrollment type, the registrar
-- can send an incomplete application back with specific reasons, and the
-- applicant fixes and resubmits it.
--
-- `returned` is the new state between submission and a decision. It is added
-- to the enum rather than replacing anything, so existing applications keep
-- the status they already hold.
--
-- admission_return_items records exactly what was wrong. item_key holds either
-- a document type or an application field name; it is a varchar rather than a
-- second enum because that field list will keep changing and an enum would
-- need a migration each time.

ALTER TABLE admission_applications
  ADD COLUMN enrollment_type enum('new','returning','transferee') NOT NULL DEFAULT 'new' AFTER grade_level_id,
  ADD COLUMN returned_at timestamp NULL DEFAULT NULL AFTER reviewed_at,
  ADD COLUMN submission_count int NOT NULL DEFAULT 1 AFTER returned_at,
  MODIFY COLUMN status enum('pending','reviewing','returned','accepted','rejected','enrolled')
    NOT NULL DEFAULT 'pending';

CREATE TABLE admission_return_items (
  id int NOT NULL AUTO_INCREMENT,
  application_id int NOT NULL,
  item_type enum('document','information') NOT NULL,
  item_key varchar(64) NOT NULL,
  note varchar(255) DEFAULT NULL,
  resolved_at timestamp NULL DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY application_id (application_id),
  CONSTRAINT fk_return_items_application
    FOREIGN KEY (application_id) REFERENCES admission_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
