-- Migration 019: admission applications
--
-- The landing page advertises admissions, but a prospective family had nowhere
-- to submit anything. enrollments cannot serve as the store: it is
-- student_id + academic_year_id + section_id, so it presupposes a students row,
-- and an applicant has neither an account nor a student record yet.
--
-- The applicant's details are COPIED into this table rather than referenced.
-- An application is a historical record of what was submitted on a given day;
-- it must not change later when the enrolled student edits their profile.
--
-- student_id points at the record created when an admin accepts, and is
-- ON DELETE SET NULL: removing a student must never erase the application that
-- produced them.
--
-- email is deliberately NOT unique. One parent applies for two children from a
-- single address, and a rejected applicant may reapply.
--
-- academic_year_id is nullable so an application still stands when it arrives
-- between school years, with no year marked active.

CREATE TABLE admission_applications (
  id int NOT NULL AUTO_INCREMENT,
  reference_number varchar(20) NOT NULL,
  academic_year_id int DEFAULT NULL,
  grade_level_id int NOT NULL,
  first_name varchar(100) NOT NULL,
  middle_name varchar(100) DEFAULT NULL,
  last_name varchar(100) NOT NULL,
  birth_date date DEFAULT NULL,
  gender enum('male','female','other') DEFAULT NULL,
  address text,
  email varchar(255) NOT NULL,
  contact_number varchar(30) DEFAULT NULL,
  guardian_name varchar(200) NOT NULL,
  guardian_relationship varchar(50) DEFAULT NULL,
  guardian_contact_number varchar(30) NOT NULL,
  guardian_email varchar(255) DEFAULT NULL,
  previous_school varchar(200) DEFAULT NULL,
  notes text,
  status enum('pending','reviewing','accepted','rejected','enrolled') NOT NULL DEFAULT 'pending',
  reviewed_by int DEFAULT NULL,
  reviewed_at timestamp NULL DEFAULT NULL,
  review_remarks text,
  student_id int DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY reference_number (reference_number),
  KEY status (status),
  KEY email (email),
  CONSTRAINT admission_applications_ibfk_1 FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT admission_applications_ibfk_2 FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id),
  CONSTRAINT admission_applications_ibfk_3 FOREIGN KEY (reviewed_by) REFERENCES users (id),
  CONSTRAINT admission_applications_ibfk_4 FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
