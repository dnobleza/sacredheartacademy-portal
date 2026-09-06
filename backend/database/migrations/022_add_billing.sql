-- Migration 022: billing, and the Cashier access level
--
-- The school could enroll a student but never bill one: there was no money in
-- the schema at all. This adds the whole chain — a fee catalogue, what each
-- grade level owes in a school year, what one student owes, and what they have
-- paid — plus the cashier who operates it.
--
-- Money is DECIMAL(10,2) and every total is computed with SUM in SQL, never in
-- JavaScript floats.
--
-- Note on levels: Cashier is level 2, the same number Laboratory Staff already
-- carries. A guard comparing the level number cannot tell them apart, so the
-- cashier routes key on the access level id instead.

INSERT INTO access_levels (id, role_id, code, level, name, description)
VALUES (8, 1, 'Lvl-2', 2, 'Cashier', 'Collects payments and issues receipts');

-- Nullable: students enrolled before this migration have no number, and the
-- cashier finds them by email until they enroll again.
ALTER TABLE students
  ADD COLUMN student_number varchar(20) DEFAULT NULL AFTER user_id,
  ADD UNIQUE KEY uq_students_student_number (student_number);

CREATE TABLE fees (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  description varchar(255) DEFAULT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fees_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- What a grade level owes for a given school year. The unique key is what
-- makes applying a schedule to a student idempotent.
CREATE TABLE fee_schedules (
  id int NOT NULL AUTO_INCREMENT,
  academic_year_id int NOT NULL,
  grade_level_id int NOT NULL,
  fee_id int NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fee_schedule (academic_year_id, grade_level_id, fee_id),
  KEY grade_level_id (grade_level_id),
  KEY fee_id (fee_id),
  CONSTRAINT fk_fee_schedules_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_fee_schedules_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels (id),
  CONSTRAINT fk_fee_schedules_fee FOREIGN KEY (fee_id) REFERENCES fees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A student's own copy of the schedule, taken when they enroll. Copied rather
-- than joined so a later price change never rewrites what a family was billed.
CREATE TABLE student_charges (
  id int NOT NULL AUTO_INCREMENT,
  student_id int NOT NULL,
  academic_year_id int NOT NULL,
  fee_id int NOT NULL,
  amount decimal(10,2) NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_charge (student_id, academic_year_id, fee_id),
  KEY academic_year_id (academic_year_id),
  KEY fee_id (fee_id),
  CONSTRAINT fk_student_charges_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_charges_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_student_charges_fee FOREIGN KEY (fee_id) REFERENCES fees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A cashier's shift. Payments attach to the open session so the drawer can be
-- reconciled at closing.
CREATE TABLE cashier_sessions (
  id int NOT NULL AUTO_INCREMENT,
  cashier_id int NOT NULL,
  opening_cash decimal(10,2) NOT NULL DEFAULT 0.00,
  closing_cash decimal(10,2) DEFAULT NULL,
  expected_cash decimal(10,2) DEFAULT NULL,
  variance decimal(10,2) DEFAULT NULL,
  status enum('open','closed') NOT NULL DEFAULT 'open',
  opened_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at timestamp NULL DEFAULT NULL,
  notes varchar(255) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY cashier_id (cashier_id),
  CONSTRAINT fk_cashier_sessions_cashier FOREIGN KEY (cashier_id) REFERENCES admins (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payments (
  id int NOT NULL AUTO_INCREMENT,
  or_number varchar(20) NOT NULL,
  student_id int NOT NULL,
  academic_year_id int NOT NULL,
  cashier_id int NOT NULL,
  session_id int DEFAULT NULL,
  amount decimal(10,2) NOT NULL,
  method enum('cash','gcash','bank_transfer','card','other') NOT NULL DEFAULT 'cash',
  reference_no varchar(50) DEFAULT NULL,
  notes varchar(255) DEFAULT NULL,
  paid_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_or_number (or_number),
  KEY student_id (student_id),
  KEY academic_year_id (academic_year_id),
  KEY cashier_id (cashier_id),
  KEY session_id (session_id),
  KEY paid_at (paid_at),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_payments_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_payments_cashier FOREIGN KEY (cashier_id) REFERENCES admins (id),
  CONSTRAINT fk_payments_session FOREIGN KEY (session_id) REFERENCES cashier_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- How one payment splits across fees. Without this the collection summary
-- cannot say how much of today's total was tuition.
CREATE TABLE payment_items (
  id int NOT NULL AUTO_INCREMENT,
  payment_id int NOT NULL,
  fee_id int NOT NULL,
  amount decimal(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY payment_id (payment_id),
  KEY fee_id (fee_id),
  CONSTRAINT fk_payment_items_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_items_fee FOREIGN KEY (fee_id) REFERENCES fees (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
