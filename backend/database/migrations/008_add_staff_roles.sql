-- Migration 008: add librarian, laboratory staff and registrar roles
--
-- The school has library, laboratory and registrar staff who need portal
-- accounts. Roles are stored in the roles table, never hardcoded.
-- These roles authenticate through users like every other role; they have no
-- profile table yet.

INSERT INTO roles (name, description) VALUES
  ('librarian', 'Librarian account'),
  ('laboratory_staff', 'Laboratory staff account'),
  ('registrar', 'Registrar account')
ON DUPLICATE KEY UPDATE description = VALUES(description);
