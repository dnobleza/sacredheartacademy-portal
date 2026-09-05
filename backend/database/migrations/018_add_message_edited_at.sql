-- Migration 018: record when a message was edited
--
-- A sender may now correct a message they already sent. The recipient must be
-- able to tell that happened — silently rewriting text someone has already
-- read is the kind of thing a school record should never allow — so the thread
-- renders an "edited" marker.
--
-- edited_at is nullable and defaults to NULL: every existing message is
-- untouched and correctly reads as never edited. It is set to the current
-- timestamp on each edit, never cleared, and is not a general-purpose
-- updated_at — marking a message read must not make it look edited, which is
-- why this is a dedicated column rather than ON UPDATE CURRENT_TIMESTAMP.
--
-- Deleting a message needs no schema: only the sender may delete, and the row
-- is removed for both participants.

ALTER TABLE messages
  ADD COLUMN edited_at timestamp NULL DEFAULT NULL AFTER is_read;
