/**
 * Declarative description of each admin resource: what the table shows and
 * what the form asks for. The columns and fields mirror the SELECT lists and
 * validators in backend/src/controllers/admin/*-controller.js — keep them in
 * step if the backend changes.
 */

const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const nameColumn = {
  field: 'name',
  label: 'Name',
  minWidth: 190,
  value: (row) => [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
};

const contactColumn = { field: 'contact_number', label: 'Mobile number', minWidth: 140 };
const emailColumn = { field: 'email', label: 'Email', minWidth: 220 };
const statusColumn = { field: 'status', label: 'Status', type: 'status', minWidth: 110 };

const personFields = [
  { name: 'first_name', label: 'First name', required: true, maxLength: 100 },
  { name: 'middle_name', label: 'Middle name', maxLength: 100 },
  { name: 'last_name', label: 'Last name', required: true, maxLength: 100 },
  { name: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS },
  { name: 'contact_number', label: 'Mobile number', maxLength: 20 },
  { name: 'address', label: 'Address', multiline: true, maxLength: 255 },
];

const emailField = {
  name: 'email',
  label: 'Email',
  type: 'email',
  required: true,
  maxLength: 255,
  // The backend only accepts email changes through the users table on update,
  // which it supports — so this stays editable.
};

const accessLevelColumn = {
  field: 'access_level_name',
  label: 'Access level',
  minWidth: 150,
  value: (row) => (row.access_level_code ? `${row.access_level_code} ${row.access_level_name}` : ''),
};

// Options are not listed here: they come from GET /admin/access-levels so the
// form always offers exactly the levels the database holds for the admin role.
const accessLevelField = {
  name: 'access_level_id',
  label: 'Access level',
  type: 'select',
  required: true,
  optionsSource: 'accessLevels',
};

const statusField = {
  name: 'status',
  label: 'Status',
  type: 'select',
  options: STATUS_OPTIONS,
  editOnly: true,
};

const ACADEMIC_YEAR_STATUS_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export const ADMIN_RESOURCES = {
  students: {
    key: 'students',
    label: 'Students',
    singular: 'Student',
    icon: 'GraduationCap',
    columns: [
      nameColumn,
      emailColumn,
      { field: 'birth_date', label: 'Birth date', type: 'date', minWidth: 130 },
      contactColumn,
      statusColumn,
    ],
    fields: [
      emailField,
      ...personFields.slice(0, 3),
      { name: 'birth_date', label: 'Birth date', type: 'date' },
      ...personFields.slice(3),
      statusField,
    ],
  },

  teachers: {
    key: 'teachers',
    label: 'Teachers',
    singular: 'Teacher',
    icon: 'Presentation',
    columns: [
      nameColumn,
      { field: 'employee_number', label: 'Employee no.', minWidth: 140 },
      emailColumn,
      contactColumn,
      statusColumn,
    ],
    fields: [
      emailField,
      { name: 'employee_number', label: 'Employee number', required: true, maxLength: 50 },
      ...personFields,
      statusField,
    ],
  },

  admins: {
    key: 'admins',
    label: 'Admins',
    singular: 'Admin',
    icon: 'ShieldCheck',
    columns: [
      nameColumn,
      { field: 'employee_number', label: 'Employee no.', minWidth: 140 },
      emailColumn,
      accessLevelColumn,
      contactColumn,
      statusColumn,
    ],
    fields: [
      emailField,
      { name: 'employee_number', label: 'Employee number', required: true, maxLength: 50 },
      accessLevelField,
      ...personFields,
      statusField,
    ],
  },

  parents: {
    key: 'parents',
    label: 'Parents',
    singular: 'Parent',
    icon: 'Users',
    columns: [nameColumn, emailColumn, contactColumn, statusColumn],
    fields: [emailField, ...personFields, statusField],
  },

  'academic-years': {
    key: 'academic-years',
    label: 'School Years',
    singular: 'School Year',
    icon: 'CalendarRange',
    // Not a person and not a login account, so the table and the delete
    // confirmation cannot fall back to first/last name or email.
    displayName: (row) => row.name,
    searchHint: 'name',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'name', label: 'Name', minWidth: 160 },
      { field: 'start_date', label: 'Start date', type: 'date', minWidth: 130 },
      { field: 'end_date', label: 'End date', type: 'date', minWidth: 130 },
      { field: 'status', label: 'Status', type: 'status', minWidth: 110 },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 20 },
      { name: 'start_date', label: 'Start date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', required: true },
      // Settable on create, not editOnly — a year is often created as
      // "upcoming" rather than defaulting server-side.
      { name: 'status', label: 'Status', type: 'select', options: ACADEMIC_YEAR_STATUS_OPTIONS },
    ],
  },

  'grade-levels': {
    key: 'grade-levels',
    label: 'Grade Levels',
    singular: 'Grade Level',
    icon: 'Layers',
    // Not a person and not a login account, same as academic years.
    displayName: (row) => row.name,
    searchHint: 'name',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'name', label: 'Name', minWidth: 190 },
      { field: 'level_number', label: 'Order', minWidth: 100 },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 50 },
      { name: 'level_number', label: 'Order', type: 'number' },
    ],
  },
};

export const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: 'LayoutDashboard', end: true },
  { to: '/admin/profile', label: 'Profile', icon: 'UserCircle' },
  {
    key: 'manage-users',
    label: 'Users Management',
    icon: 'UsersRound',
    children: [
      { to: '/admin/students', label: 'Students', icon: 'GraduationCap' },
      { to: '/admin/teachers', label: 'Teachers', icon: 'Presentation' },
      { to: '/admin/parents', label: 'Parents', icon: 'Users' },
      // Managing admin accounts is Super Admin only on the server; hiding the
      // link keeps a lower-level admin from walking into a 403.
      { to: '/admin/admins', label: 'Admins', icon: 'ShieldCheck', minAccessLevel: 4 },
    ],
  },
  {
    key: 'academic',
    label: 'Academic Management',
    icon: 'CalendarDays',
    children: [
      { to: '/admin/academic-years', label: 'School Year', icon: 'CalendarRange' },
      { to: '/admin/grade-levels', label: 'Grade Level', icon: 'Layers' },
    ],
  },
];
