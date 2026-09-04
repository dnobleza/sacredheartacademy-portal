-- Migration 009: replace the staff roles with an access_levels table
--
-- Migration 008 added librarian, laboratory_staff and registrar as roles. That
-- was the wrong model: the school treats those as access tiers inside the admin
-- role, not as roles of their own. This migration introduces access_levels,
-- points every user at one, and reverts roles to the four primary roles.
--
-- Authorization still keys off the role name. The level is stored and exposed
-- now so a level-based guard can be added later without another migration.

CREATE TABLE access_levels (
  id int NOT NULL AUTO_INCREMENT,
  role_id int NOT NULL,
  code varchar(10) NOT NULL,
  level tinyint unsigned NOT NULL,
  name varchar(50) NOT NULL,
  description varchar(255) DEFAULT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY name (name),
  -- Redundant on its own, but it lets users carry a composite foreign key on
  -- (access_level_id, role_id) so the database rejects a user whose level
  -- belongs to a different role.
  UNIQUE KEY id_role (id, role_id),
  KEY role_id (role_id),
  CONSTRAINT access_levels_ibfk_1 FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO access_levels (role_id, code, level, name, description) VALUES
  ((SELECT id FROM roles WHERE name = 'student'), 'Lvl-0', 0, 'Student', 'Student account'),
  ((SELECT id FROM roles WHERE name = 'parent'), 'Lvl-0', 0, 'Parent', 'Parent account'),
  ((SELECT id FROM roles WHERE name = 'teacher'), 'Lvl-1', 1, 'Teacher', 'Teacher account'),
  ((SELECT id FROM roles WHERE name = 'admin'), 'Lvl-2', 2, 'Laboratory Staff', 'Laboratory staff account'),
  ((SELECT id FROM roles WHERE name = 'admin'), 'Lvl-3', 3, 'Librarian', 'Librarian account'),
  ((SELECT id FROM roles WHERE name = 'admin'), 'Lvl-3', 3, 'Registrar', 'Registrar account'),
  ((SELECT id FROM roles WHERE name = 'admin'), 'Lvl-4', 4, 'Super Admin', 'Full administrative access');

ALTER TABLE users ADD COLUMN access_level_id int NULL AFTER role_id;

-- Accounts created on a migration 008 staff role move to the admin role at the
-- equivalent level, which is what those roles meant all along. This has to run
-- before the general backfill: there is no access level under roles 5-7, so
-- such a user would otherwise be left NULL and fail the NOT NULL change below.
UPDATE users
  JOIN roles ON roles.id = users.role_id
  JOIN access_levels ON access_levels.name = CASE roles.name
         WHEN 'librarian' THEN 'Librarian'
         WHEN 'laboratory_staff' THEN 'Laboratory Staff'
         WHEN 'registrar' THEN 'Registrar'
       END
   SET users.role_id = access_levels.role_id,
       users.access_level_id = access_levels.id
 WHERE roles.name IN ('librarian', 'laboratory_staff', 'registrar');

-- Backfill everyone else from the role they already have. Existing admins
-- become Super Admin: the only admin on record is the account the school signs
-- in with, and a lower tier would lock it out once level guards land.
UPDATE users
   SET access_level_id = (
     SELECT al.id
       FROM access_levels al
       JOIN roles r ON r.id = al.role_id
      WHERE al.role_id = users.role_id
        AND (r.name <> 'admin' OR al.name = 'Super Admin')
      LIMIT 1
   )
 WHERE access_level_id IS NULL;

ALTER TABLE users MODIFY COLUMN access_level_id int NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_ibfk_2
  FOREIGN KEY (access_level_id, role_id) REFERENCES access_levels (id, role_id);

-- Reverts migration 008. The staff roles are now unreferenced: any account on
-- one was moved to the admin role above. The AND clause is belt and braces.
DELETE FROM roles
 WHERE name IN ('librarian', 'laboratory_staff', 'registrar')
   AND id NOT IN (SELECT DISTINCT role_id FROM users);
