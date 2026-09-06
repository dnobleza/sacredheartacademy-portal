-- Migration 026: the downpayment becomes a percentage
--
-- A hand-typed peso figure goes stale the moment tuition changes, and it never
-- expressed the actual school rule: the downpayment is a share of what the
-- grade level owes. Storing the percent makes the figure follow the fees.
--
-- The backfill runs before the drop so nothing changes value on the day of the
-- migration: each existing amount becomes its equivalent percentage of that
-- grade level's total charges. Rounding to two decimals can move a computed
-- figure by well under a peso, so set clean rates afterwards.

ALTER TABLE enrollment_downpayments
  ADD COLUMN percentage decimal(5,2) NOT NULL DEFAULT 0 AFTER grade_level_id;

UPDATE enrollment_downpayments d
  JOIN (
    SELECT academic_year_id, grade_level_id, SUM(amount) AS total
    FROM fee_schedules
    GROUP BY academic_year_id, grade_level_id
  ) s
    ON s.academic_year_id = d.academic_year_id
   AND s.grade_level_id = d.grade_level_id
  SET d.percentage = ROUND(d.amount / s.total * 100, 2)
  WHERE s.total > 0;

-- Keeping a dead amount beside the live rule is how the two drift apart.
ALTER TABLE enrollment_downpayments DROP COLUMN amount;
