-- Migration 015: add advisory_classes
--
-- This table answers "which teacher is the adviser of which section, for
-- which school year". It is easy to confuse with class_subjects, which
-- answers a different question: "who teaches which SUBJECT to a section".
-- A section can have many class_subjects rows (one per subject/teacher pair)
-- but should have exactly one adviser per school year, hence the
-- UNIQUE(section_id, academic_year_id) below rather than reusing
-- class_subjects with a special subject row.
--
-- The same teacher may advise several sections in a year, and a section's
-- adviser may change from one school year to the next, so the uniqueness
-- constraint is scoped per (section, academic_year), not per section alone
-- and not per teacher.

CREATE TABLE advisory_classes (
  id int NOT NULL AUTO_INCREMENT,
  section_id int NOT NULL,
  academic_year_id int NOT NULL,
  teacher_id int NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY section_year (section_id, academic_year_id),
  KEY academic_year_id (academic_year_id),
  KEY teacher_id (teacher_id),
  CONSTRAINT advisory_classes_ibfk_1 FOREIGN KEY (section_id) REFERENCES sections (id),
  CONSTRAINT advisory_classes_ibfk_2 FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT advisory_classes_ibfk_3 FOREIGN KEY (teacher_id) REFERENCES teachers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
