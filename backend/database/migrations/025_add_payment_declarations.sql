-- Migration 025: a student declares a payment, the cashier confirms it
--
-- Until now only the cashier could record money, so a student who paid by
-- GCash or bank transfer had no way to say so. A declaration is a claim, not
-- money: it never touches balances. Only the cashier's confirmation writes a
-- payments row, which keeps every total and report derived from confirmed
-- money alone.
--
-- The chain it completes:
--   accepted -> student told to pay -> student declares -> cashier notified
--   -> cashier confirms -> payment recorded -> registrar notified to enrol

CREATE TABLE payment_declarations (
  id int NOT NULL AUTO_INCREMENT,
  student_id int NOT NULL,
  academic_year_id int NOT NULL,
  amount decimal(10,2) NOT NULL,
  method enum('cash','gcash','bank_transfer','card','other') NOT NULL DEFAULT 'gcash',
  reference_no varchar(50) DEFAULT NULL,
  note varchar(255) DEFAULT NULL,
  proof_image_id int DEFAULT NULL,
  status enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  payment_id int DEFAULT NULL,
  reviewed_by int DEFAULT NULL,
  reviewed_at timestamp NULL DEFAULT NULL,
  review_remarks varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY student_id (student_id),
  KEY status (status),
  KEY academic_year_id (academic_year_id),
  KEY proof_image_id (proof_image_id),
  KEY payment_id (payment_id),
  KEY reviewed_by (reviewed_by),
  CONSTRAINT fk_decl_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_decl_year FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  CONSTRAINT fk_decl_proof FOREIGN KEY (proof_image_id) REFERENCES images (id) ON DELETE SET NULL,
  CONSTRAINT fk_decl_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE SET NULL,
  CONSTRAINT fk_decl_reviewer FOREIGN KEY (reviewed_by) REFERENCES admins (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
