-- Migration 001: add student_parents and admins tables
-- Additive only. No existing table, column, or constraint is modified or dropped.

CREATE TABLE IF NOT EXISTS student_parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  parent_id INT NOT NULL,
  relationship ENUM('mother', 'father', 'guardian', 'other') NOT NULL DEFAULT 'guardian',
  is_primary_contact TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_student_parent UNIQUE (student_id, parent_id),
  CONSTRAINT fk_student_parents_student FOREIGN KEY (student_id)
    REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_parents_parent FOREIGN KEY (parent_id)
    REFERENCES parents (id) ON DELETE CASCADE,
  INDEX idx_student_parents_parent (parent_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  employee_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  contact_number VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_admins_user UNIQUE (user_id),
  CONSTRAINT uq_admins_employee_number UNIQUE (employee_number),
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
