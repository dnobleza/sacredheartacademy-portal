---
name: school-management-open-gaps
description: School Management repo has no git init and no .gitignore while .env holds real secrets
metadata:
  type: project
---

As of 2026-09-02 `C:\Users\denobleza\desktop\school-management` is not a git repository and has no `.gitignore`, while `backend/.env` contains real `DB_PASSWORD`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`. `backend/src/logs/` (winston output) is also untracked-but-unignored. No `.env.example` exists.

**Why:** A first `git init` followed by `git add .` would commit live secrets and log files. CLAUDE.md section 23 rule 4 forbids committing `.env`.

**How to apply:** Write `.gitignore` (`node_modules/`, `.env`, `src/logs/`) and `.env.example` before running `git init`. Also missing: `express-rate-limit` and a validation library (`express-validator`), both required by CLAUDE.md sections 27 and 28.
