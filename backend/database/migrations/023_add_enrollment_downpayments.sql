-- Migration 023: the downpayment that gates enrollment
--
-- Acceptance no longer enrolls a student. An accepted applicant must first pay
-- a downpayment; the cashier records it, the registrar is notified, and only
-- then is the student enrolled and given a section.
--
-- The amount is per grade level per school year. A grade level with no row here
-- requires nothing, so a year nobody has configured still enrolls normally.

CREATE TABLE enrollment_downpayments (
  id int NOT NULL AUTO_INCREMENT,
  academic_year_id int NOT NULL,
  grade_level_id int NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_downpayment (academic_year_id, grade_level_id),
  KEY grade_level_id (grade_level_id),
  CONSTRAINT fk_downpayment_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_downpayment_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
