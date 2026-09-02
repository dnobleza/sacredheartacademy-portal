---
name: school-management-stack
description: School Management System backend runs plain JavaScript CommonJS + MySQL, not TypeScript/Supabase
metadata:
  type: project
---

Backend is JavaScript (CommonJS, `type: "commonjs"`) with Express 5, mysql2, jsonwebtoken, bcryptjs, winston, helmet, morgan, cookie-parser. Database is MySQL, schema `sacred_heart_academy`. Planned frontend is React + Vite + MUI + Axios (not created as of 2026-09-02).

**Why:** The agent definitions copied into `.claude/agents/` on 2026-09-02 came from a different project and describe Express + TypeScript + Zod + Supabase/PostgreSQL + React 19 + Tailwind + shadcn + TanStack Query. That stack is wrong for this repo.

**How to apply:** Ignore the TypeScript/Supabase/Tailwind wording in those agent files, or rewrite them. Write plain JS with `require`/`module.exports`. See [[school-management-schema]] and [[school-management-open-gaps]].
