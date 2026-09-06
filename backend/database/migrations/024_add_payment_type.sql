-- Migration 024: record whether a payment settled the account or part of it
--
-- The cashier now chooses Full or Partial at the counter. Storing the choice
-- rather than deriving it keeps a receipt honest: a payment that cleared the
-- balance on the day still reads as Paid after new charges are added later.
--
-- Existing rows default to 'partial' — nothing recorded about them says they
-- cleared an account, so claiming otherwise would be a guess.

ALTER TABLE payments
  ADD COLUMN payment_type enum('full','partial') NOT NULL DEFAULT 'partial' AFTER amount;
