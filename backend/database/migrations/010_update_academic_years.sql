-- Migration 010: add timestamps and a name uniqueness constraint to academic_years
--
-- academic_years predates the created_at/updated_at convention used elsewhere
-- (see teachers, students, parents) and had no protection against two rows
-- sharing a name such as "2025-2026". Both gaps matter once the admin CRUD API
-- goes live: the list endpoint orders/audits by these columns, and duplicate
-- names would make the school year picker on the frontend ambiguous.

ALTER TABLE academic_years
  ADD COLUMN created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY name (name);
