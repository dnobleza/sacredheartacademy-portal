-- Migration 020: admission documents and section capacity
--
-- Two additions that turn an admission application into an enrollment.
--
-- 1. admission_documents holds the paperwork an applicant attaches to the
--    public form: good moral, form 137, PSA birth certificate, 2x2 ID picture.
--    The files are not stored in `images` because that table's uploaded_by is
--    a NOT NULL foreign key to users, and a public applicant has no account.
--    The columns mirror `images` so the same streaming helper serves both.
--
-- 2. sections.capacity lets accept-an-application place a student
--    automatically: sections fill in name order until each one is full, so an
--    early applicant lands in the earlier section. The 40 default gives every
--    existing section a working number; the registrar edits it per section.

ALTER TABLE sections
  ADD COLUMN capacity int NOT NULL DEFAULT 40 AFTER room;

CREATE TABLE admission_documents (
  id int NOT NULL AUTO_INCREMENT,
  application_id int NOT NULL,
  document_type enum('good_moral','form_137','psa_birth_certificate','id_picture') NOT NULL,
  filename varchar(255) NOT NULL,
  original_name varchar(255) DEFAULT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes int NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY filename (filename),
  UNIQUE KEY uq_application_document (application_id, document_type),
  CONSTRAINT fk_admission_documents_application
    FOREIGN KEY (application_id) REFERENCES admission_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
