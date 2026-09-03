# CLAUDE.md

# School Management System

## 1. Project Overview

This project is a full-stack School Management System designed to manage students, teachers, parents, administrators, academics, attendance, grades, assignments, schedules, announcements, messaging, and notifications.

The application has four primary user roles:

- Admin
- Teacher
- Student
- Parent

## 2. Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Axios
- React Router
- Material UI (MUI)

### Backend

- Node.js
- Express.js
- JavaScript
- REST API
- JWT authentication
- bcryptjs password hashing

### Database

- MySQL
- mysql2

### Development

- Nodemon
- dotenv
- Git

## 3. Project Structure

Current structure. Backend uses a `src/` layer. Frontend is not created yet.

```text
school-management/
│
├── CLAUDE.md
├── .gitignore
│
├── .claude/
│   ├── agents/            # role-specific agent definitions
│   └── memory/            # project notes
│
└── backend/
    ├── .env               # git-ignored, real secrets
    ├── .env.example
    ├── package.json
    │
    ├── database/
    │   └── migrations/    # numbered .sql files, applied manually
    │
    └── src/
        ├── app.js         # express app, middleware, error handling
        ├── server.js      # startup, db ping, graceful shutdown
        │
        ├── config/
        │   ├── database.js
        │   └── env.js
        │
        ├── controllers/
        │   ├── admin/
        │   ├── teachers/
        │   ├── students/
        │   ├── parents/
        │   └── shared/    # auth, messages, notifications
        │
        ├── routes/
        │   ├── admin/
        │   ├── teachers/
        │   ├── students/
        │   ├── parents/
        │   └── shared/
        │
        ├── middleware/
        ├── utils/
        │   └── logger.js  # winston
        ├── validations/
        └── logs/          # git-ignored, winston output
```

Controllers and routes are both split into one folder per role. Cross-role
logic (authentication, messaging, notifications) goes in the `shared/` folder
of each.

`app.js` exports the configured express app and does not listen. `server.js`
requires it, verifies the database connection, then listens.

Planned additions, not yet created:

```text
backend/src/models/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── routes/
│   └── utils/
├── public/
├── package.json
└── vite.config.js
```

Paths in later sections that omit `src/` (e.g. `controllers/authController.js`)
resolve to `backend/src/`.

Do not reorganize the project structure unnecessarily.

---

# 4. User Roles

The system has four primary roles:

```text
admin
teacher
student
parent
```

It also has three staff roles:

```text
librarian
laboratory_staff
registrar
```

Staff roles authenticate through the same `users` table as every other role.
They have no role-specific profile table yet, so `findProfileByUserId` in
`controllers/shared/auth-controller.js` returns `null` for them. That is
expected. Add a profile table only when a staff role needs profile data.

Roles must be stored in the database and must not be hardcoded throughout the application.

Use the `roles` table and reference it from the `users` table.

---

# 5. Authentication Architecture

All users authenticate through the `users` table.

Do NOT create separate authentication systems for:

- Admin
- Teacher
- Student
- Parent

The relationship should be:

```text
roles
   │
   ▼
users
   │
   ├── admins
   ├── teachers
   ├── students
   └── parents
```

The `users` table is responsible for authentication.

Role-specific tables contain profile information.

Example:

```text
users
- id
- role_id
- email
- password_hash
- status

students
- id
- user_id
- first_name
- middle_name
- last_name
- birth_date
- gender
- address
- contact_number
...
```

---

# 6. Authentication Requirements

Use JWT for authentication.

Passwords must NEVER be stored as plain text.

Use bcryptjs for password hashing.

Example:

```js
const hashedPassword = await bcrypt.hash(password, 12);
```

Passwords must be verified using bcrypt.

JWT secrets must come from environment variables.

Never hardcode:

```text
JWT_SECRET
JWT_REFRESH_SECRET
DB_PASSWORD
```

Use `.env`.

---

# 7. Authorization

Authentication and authorization are different.

Authentication determines:

```text
Who is the user?
```

Authorization determines:

```text
What is the user allowed to do?
```

Protected routes must verify both.

Example:

```text
authenticateToken
       │
       ▼
checkRole("admin")
       │
       ▼
Admin Controller
```

Never rely on frontend route protection alone.

Backend authorization is mandatory.

---

# 8. Database Design

The primary database is MySQL.

Core tables:

```text
roles
users
students
parents
student_parents
teachers
admins
academic_years
grade_levels
sections
subjects
teacher_subjects
enrollments
class_subjects
schedules
attendance
grades
assignments
submissions
announcements
messages
notifications
```

---

# 9. Database Relationships

Important relationships:

```text
roles
  │
  ▼
users
  │
  ├── students
  ├── teachers
  ├── parents
  └── admins
```

Students and parents have a many-to-many relationship:

```text
students
    │
    ▼
student_parents
    ▲
    │
parents
```

This allows:

- One parent to have multiple children.
- One student to have multiple parents/guardians.

Students should NOT contain a single `parent_id`.

---

# 10. Academic Structure

The academic structure should follow:

```text
Academic Year
      │
      ▼
Grade Level
      │
      ▼
Section
      │
      ▼
Class Subject
      │
      ├── Subject
      └── Teacher
```

Students are connected to sections through:

```text
enrollments
```

Do not permanently store the current section directly in the student record because students may change sections between academic years.

---

# 11. Database Rules

Always use parameterized queries.

GOOD:

```js
const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
```

BAD:

```js
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

Never concatenate user input into SQL queries.

This prevents SQL injection.

Use foreign keys for relationships.

Use appropriate indexes for:

- Foreign keys
- Email
- Employee number
- Frequently searched fields

Use `UNIQUE` constraints where appropriate.

---

# 12. Database Naming Conventions

Use:

```text
snake_case
```

for database names.

Examples:

```text
student_parents
academic_years
class_subjects
created_at
updated_at
```

Use singular names for entity concepts only when appropriate, but maintain consistency across the schema.

Primary keys should normally be:

```sql
id INT PRIMARY KEY AUTO_INCREMENT
```

Foreign keys should follow:

```text
<entity>_id
```

Examples:

```text
student_id
teacher_id
parent_id
subject_id
section_id
```

---

# 13. API Architecture

Use RESTful APIs.

Base API:

```text
/api
```

Authentication:

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Students:

```text
GET    /api/students
GET    /api/students/:id
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
```

Teachers:

```text
GET    /api/teachers
GET    /api/teachers/:id
POST   /api/teachers
PUT    /api/teachers/:id
DELETE /api/teachers/:id
```

Parents:

```text
GET    /api/parents
GET    /api/parents/:id
POST   /api/parents
PUT    /api/parents/:id
DELETE /api/parents/:id
```

Use consistent HTTP status codes.

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

---

# 14. Controller Rules

Controllers should handle HTTP requests and responses.

Do not put large amounts of database logic directly inside controllers.

Prefer:

```text
Route
  │
  ▼
Middleware
  │
  ▼
Controller
  │
  ▼
Model / Database
```

Keep responsibilities separated.

---

# 15. Middleware

Common middleware:

```text
authMiddleware
roleMiddleware
errorMiddleware
```

Authentication middleware verifies JWT.

Role middleware verifies permissions.

Error middleware handles unexpected errors consistently.

---

# 16. Error Handling

Do not expose sensitive internal errors to clients.

Bad:

```js
res.status(500).json({
  error: err.stack,
});
```

Better:

```js
res.status(500).json({
  message: 'Internal server error',
});
```

Log detailed errors on the server.

Use consistent response structures.

Example:

```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Student not found"
}
```

---

# 17. Frontend Architecture

React should be organized by responsibility.

Recommended structure:

```text
src/
├── components/
├── pages/
├── layouts/
├── services/
├── hooks/
├── context/
├── routes/
└── utils/
```

Pages should represent application screens.

Components should contain reusable UI.

Services should handle API communication.

Do not put large Axios requests directly into UI components when a service can be used.

---

# 18. Frontend Routing

Use React Router.

Routes should be protected based on authentication and role.

Example:

```text
/login

/admin/dashboard
/admin/students
/admin/teachers
/admin/parents

/teacher/dashboard
/teacher/classes
/teacher/attendance
/teacher/grades
/teacher/assignments

/student/dashboard
/student/classes
/student/grades
/student/assignments
/student/attendance

/parent/dashboard
/parent/children
/parent/grades
/parent/attendance
/parent/announcements
```

A user must not access another role's dashboard.

For example:

```text
student → /admin/dashboard
```

must be rejected.

---

# 19. Parent Functionality

Parents must be able to manage/view multiple children through the `student_parents` relationship.

A parent dashboard should be able to display:

```text
Children
Grades
Attendance
Assignments
Announcements
Schedules
Messages
Notifications
```

Do not assume one parent has only one student.

---

# 20. Student Functionality

Students should be able to view:

```text
Dashboard
Profile
Subjects
Schedule
Attendance
Grades
Assignments
Submissions
Announcements
Messages
Notifications
```

Students should only access their own academic information unless an administrator explicitly grants additional permissions.

---

# 21. Teacher Functionality

Teachers should be able to:

```text
View assigned classes
View assigned subjects
View students
Record attendance
Manage grades
Create assignments
Review submissions
Post announcements
Message parents/students
```

Teachers should only modify academic records for classes/subjects assigned to them.

---

# 22. Admin Functionality

Admins should have management access to:

```text
Users
Students
Teachers
Parents
Academic Years
Grade Levels
Sections
Subjects
Enrollments
Schedules
Attendance
Grades
Assignments
Announcements
Messages
Notifications
```

Admin permissions should still be implemented through backend authorization.

---

# 23. Security Rules

Always follow these rules:

1. Never store plain-text passwords.
2. Never expose passwords through API responses.
3. Never hardcode secrets.
4. Never commit `.env`.
5. Use parameterized SQL queries.
6. Validate incoming data.
7. Sanitize user-controlled content where necessary.
8. Protect authenticated endpoints.
9. Implement server-side role authorization.
10. Do not trust frontend authorization.
11. Do not expose unnecessary database fields.
12. Do not return password hashes to clients.

---

# 24. Environment Variables

Use:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=school

JWT_SECRET=
JWT_REFRESH_SECRET=
```

Never commit actual secret values.

Provide `.env.example` instead:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=school

JWT_SECRET=
JWT_REFRESH_SECRET=
```

---

# 25. Git Rules

Do not commit:

```text
node_modules/
.env
.env.local
dist/
build/
*.log
```

Use `.gitignore`.

Commit meaningful changes.

Examples:

```text
feat: add student management
feat: add parent-child relationship
fix: correct attendance query
fix: prevent unauthorized student access
refactor: improve authentication middleware
```

## Branches

Remote: https://github.com/dnobleza/sacredheartacademy-portal

```text
master   production
dev      integration, all work lands here first
```

All building must be pushed to `dev` first. Merge `dev` into `master` only
once the work is verified. Never commit directly to `master`.

---

# 26. Coding Standards

Use modern JavaScript.

Prefer:

```js
const
let
async/await
```

Avoid unnecessary:

```js
var
```

Use descriptive variable names.

GOOD:

```js
const studentId = req.params.id;
const student = await getStudentById(studentId);
```

Avoid:

```js
const x = req.params.id;
const y = await get(x);
```

Keep functions focused on one responsibility.

Avoid unnecessarily large files.

---

# 27. API Security

Use:

```text
helmet
cors
express-rate-limit
```

where appropriate.

CORS should allow only known frontend origins in production.

Do not use:

```js
cors({
  origin: '*',
});
```

for a production application handling authenticated data.

---

# 28. Validation

Validate all user input.

Validate:

```text
Email
Password
Employee number
Names
Dates
Grades
Attendance status
IDs
```

Use `express-validator` or another established validation library.

Never assume frontend validation is sufficient.

Frontend validation improves user experience.

Backend validation provides security and data integrity.

---

# 29. File Uploads

If assignments require file submissions:

```text
multer
```

may be used.

Uploaded files must be validated for:

- File type
- File size
- Filename
- Storage location

Do not trust the original filename supplied by the client.

---

# 30. Development Commands

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Production:

```bash
npm start
```

---

# 31. Important Development Rule

Before making a significant change:

1. Inspect the existing code.
2. Understand the current architecture.
3. Check existing database relationships.
4. Avoid duplicating existing functionality.
5. Preserve working functionality.
6. Make the smallest reasonable change.
7. Test the affected functionality.
8. Report what was changed.

Do not rewrite working code unnecessarily.

---

# 32. Database Change Rule

Before modifying the database schema:

1. Check existing tables.
2. Check foreign keys.
3. Check existing queries.
4. Determine whether the change affects existing API endpoints.
5. Consider migration/backward compatibility.
6. Document the change.

Never casually rename or delete database columns.

Never drop tables without explicit approval.

---

# 33. Testing

When implementing backend functionality, test:

```text
Successful request
Invalid request
Unauthorized request
Forbidden request
Missing record
Duplicate record
Database failure
```

For role-based functionality, test each relevant role.

Example:

```text
Admin → allowed
Teacher → allowed/denied depending on resource
Student → restricted
Parent → restricted
Unauthenticated → denied
```

---

# 34. Data Privacy

The application contains sensitive school information.

Do not expose information unnecessarily.

A parent should only be able to access information belonging to their linked children.

A student should only be able to access their own information.

A teacher should only access students/classes relevant to their assignments.

Admins may have broader access according to their permissions.

Always enforce these rules on the backend.

---

# 35. Do Not Do These Things

Do NOT:

- Rewrite the entire project without approval.
- Change the database architecture unnecessarily.
- Remove working features.
- Hardcode passwords.
- Hardcode JWT secrets.
- Store plain-text passwords.
- Trust frontend authorization.
- Build SQL queries using string concatenation.
- Expose database errors to users.
- Duplicate authentication logic.
- Create a separate login table for every role.
- Assume a student has only one parent.
- Assume a parent has only one child.
- Store current section permanently in the student profile.
- Delete database tables without explicit approval.

---

# 36. Priority Order

When making technical decisions, prioritize:

1. Security
2. Data integrity
3. Correctness
4. Maintainability
5. Performance
6. Developer convenience

Do not sacrifice security or data integrity for convenience.

---

# 37. Change Management

When asked to implement a feature:

### Step 1

Understand the requirement.

### Step 2

Inspect the relevant existing files.

### Step 3

Identify affected:

```text
Database
Backend
API
Authentication
Authorization
Frontend
```

### Step 4

Implement the smallest clean solution.

### Step 5

Test the change.

### Step 6

Check for regressions.

### Step 7

Summarize:

```text
Files changed
Database changes
API changes
Testing performed
Potential follow-up work
```

---

# 38. General Rule

The goal is to build a maintainable, secure, production-ready School Management System.

Favor clear architecture over shortcuts.

Do not blindly follow an existing implementation if it introduces security, database integrity, or architectural problems.

When requirements are ambiguous, identify the ambiguity and choose the safest reasonable implementation rather than making destructive assumptions.
