-- The fee catalogue. Amounts are not here: what each fee costs depends on the
-- grade level and school year, and lives in fee_schedules, which a Super Admin
-- fills in per year.

INSERT INTO fees (id, name, description) VALUES
  (1, 'Tuition', 'Core tuition for the school year'),
  (2, 'Registration Fee', 'Charged once on enrollment'),
  (3, 'Laboratory Fee', 'Science and computer laboratory use'),
  (4, 'Library Fee', 'Library access and materials'),
  (5, 'Miscellaneous Fee', 'General school operations'),
  (6, 'ID Fee', 'Student identification card'),
  (7, 'Other Fees', 'Anything not covered above');
