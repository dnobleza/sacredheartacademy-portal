-- Migration 006: grace window for rotated refresh tokens
--
-- Strict single-use rotation broke legitimate concurrent refreshes: two open
-- tabs (or React StrictMode's double mount in development) both present the
-- same valid cookie, the first rotates it, and the second is rejected as a
-- replay — signing the user out.
--
-- redeemable_until draws the distinction:
--   NULL  -> revoked outright (logout). Never redeemable again.
--   value -> revoked by rotation. Still redeemable until this instant, so a
--            request already in flight succeeds, while a token stolen and
--            replayed later is still refused.

ALTER TABLE revoked_tokens
  ADD COLUMN redeemable_until DATETIME NULL DEFAULT NULL AFTER expires_at;
