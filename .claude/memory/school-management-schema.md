---
name: school-management-schema
description: MySQL schema sacred_heart_academy has 22 tables; student_parents and admins added 2026-09-02
metadata:
  type: project
---

Database `sacred_heart_academy` (MySQL, InnoDB, utf8mb4_0900_ai_ci) has 22 tables. All empty except `roles`, seeded with admin=1, teacher=2, student=3, parent=4.

On 2026-09-02 two tables missing from the original schema were added via `backend/database/migrations/001_add_student_parents_and_admins.sql`:
- `student_parents` — many-to-many join, UNIQUE `(student_id, parent_id)`, plus `relationship` enum and `is_primary_contact`. Students deliberately have no `parent_id` column.
- `admins` — `user_id` UNIQUE FK to users, `employee_number` UNIQUE, name fields.

**Why:** Parents previously had zero relationship to students, so no parent feature could work; admins could authenticate but had no profile row.

**How to apply:** Migrations live in `backend/database/migrations/`, numbered, applied manually — there is no migration runner or tracking table. Check `information_schema` before assuming a table's shape. See [[school-management-stack]].

Migration 002 (2026-09-02) restructured `students`: dropped `student_number`, renamed `date_of_birth` to `birth_date`, added `address`, `contact_number`, `updated_at`. Students are now identified by `users.email` alone. CLAUDE.md sections 8, 11 and 28 still reference `student_number` and contradict the live schema.
