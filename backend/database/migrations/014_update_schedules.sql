-- Migration 014: add timestamps and a slot-uniqueness guard to schedules
--
-- schedules predates the created_at/updated_at convention used elsewhere
-- (see sections, subjects, academic_years). Add it here for consistency with
-- the rest of the schema and so the API can report/audit by it.
--
-- The API's clash-detection (same teacher/section overlapping in time) is
-- enforced in application code because it spans rows, not just columns. But
-- the exact-same-slot case -- the same class_subject scheduled twice for the
-- identical day and start_time -- is a pure column-level duplicate, so it is
-- also enforced here as a database constraint rather than trusted to the
-- application alone.

ALTER TABLE schedules
  ADD COLUMN created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD UNIQUE KEY class_subject_slot (class_subject_id, day_of_week, start_time);
