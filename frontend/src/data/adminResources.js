/**
 * Declarative description of each admin resource: what the table shows and
 * what the form asks for. The columns and fields mirror the SELECT lists and
 * validators in backend/src/controllers/admin/*-controller.js — keep them in
 * step if the backend changes.
 */

import { createElement } from 'react';
import ClassStudentsDetail from '../components/admin/ClassStudentsDetail';

const DAY_OPTIONS = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
];

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

// MySQL TIME columns serialise as HH:MM:SS. The seconds are always zero for a
// class period, so they are dropped for display.
const toHourMinute = (value) => (value ? String(value).slice(0, 5) : value);

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
  // Stores images.id, not the file. ImageField uploads on selection and hands
  // back the id, so submitting the form only writes the reference.
  { name: 'photo_id', label: 'Photo', type: 'image' },
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

const ANNOUNCEMENT_AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
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

  sections: {
    key: 'sections',
    label: 'Sections',
    singular: 'Section',
    icon: 'DoorOpen',
    // Not a person and not a login account, same as academic years.
    // Section names repeat across grade levels ("Section A" exists under every
    // one), so the grade level is what tells two rows apart in the row action
    // labels and the delete confirmation.
    displayName: (row) =>
      row.grade_level_name ? `${row.name} — ${row.grade_level_name}` : row.name,
    searchHint: 'name, room or grade level',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'name', label: 'Name', minWidth: 160 },
      { field: 'grade_level_name', label: 'Grade level', minWidth: 160 },
      { field: 'room', label: 'Room', minWidth: 120 },
    ],
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 100 },
      {
        name: 'grade_level_id',
        label: 'Grade level',
        type: 'select',
        required: true,
        optionsSource: 'gradeLevels',
      },
      { name: 'room', label: 'Room', maxLength: 50 },
    ],
  },

  subjects: {
    key: 'subjects',
    label: 'Subjects',
    singular: 'Subject',
    icon: 'BookOpen',
    // Not a person and not a login account, same as the other academic
    // resources. Codes are unique but names are not (two codes can share a
    // name), so the code is what identifies a row in the delete confirmation.
    displayName: (row) => row.name,
    searchHint: 'code or name',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'code', label: 'Code', minWidth: 110 },
      { field: 'name', label: 'Name', minWidth: 190 },
      { field: 'description', label: 'Description', minWidth: 240 },
    ],
    fields: [
      { name: 'code', label: 'Code', required: true, maxLength: 30 },
      { name: 'name', label: 'Name', required: true, maxLength: 100 },
      { name: 'description', label: 'Description', multiline: true, maxLength: 1000 },
    ],
  },

  schedules: {
    key: 'schedules',
    label: 'Schedules',
    singular: 'Schedule',
    icon: 'CalendarClock',
    // Not a person and not a login account. A schedule has no single natural
    // name, so build one from subject + section + day + start time — enough
    // to tell any two rows apart in the row action labels and the delete
    // confirmation.
    displayName: (row) =>
      `${row.subject_name} — ${row.section_name} (${row.day_of_week} ${toHourMinute(row.start_time)})`,
    searchHint: 'section, subject or teacher',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'day_of_week', label: 'Day', minWidth: 110 },
      { field: 'start_time', label: 'Start', minWidth: 90, value: (row) => toHourMinute(row.start_time) },
      { field: 'end_time', label: 'End', minWidth: 90, value: (row) => toHourMinute(row.end_time) },
      { field: 'subject_name', label: 'Subject', minWidth: 160 },
      { field: 'section_name', label: 'Section', minWidth: 140 },
      { field: 'teacher_name', label: 'Teacher', minWidth: 160 },
      { field: 'room', label: 'Room', minWidth: 100 },
    ],
    fields: [
      {
        name: 'section_id',
        label: 'Section',
        type: 'select',
        required: true,
        optionsSource: 'sections',
      },
      {
        name: 'subject_id',
        label: 'Subject',
        type: 'select',
        required: true,
        optionsSource: 'subjects',
      },
      {
        name: 'teacher_id',
        label: 'Teacher',
        type: 'select',
        required: true,
        optionsSource: 'teachers',
      },
      {
        name: 'academic_year_id',
        label: 'School year',
        type: 'select',
        required: true,
        optionsSource: 'academicYears',
      },
      {
        name: 'day_of_week',
        label: 'Day',
        type: 'select',
        required: true,
        options: DAY_OPTIONS,
      },
      { name: 'start_time', label: 'Start time', type: 'time', required: true },
      { name: 'end_time', label: 'End time', type: 'time', required: true },
      { name: 'room', label: 'Room', maxLength: 50 },
    ],
  },

  classes: {
    key: 'classes',
    label: 'Classes',
    singular: 'Class',
    icon: 'Users2',
    // Section names repeat across grade levels, so the grade level is what
    // separates one advisory class from another in the row action labels and
    // the delete confirmation.
    displayName: (row) =>
      `${row.section_name} — ${row.grade_level_name} (${row.academic_year_name})`,
    searchHint: 'section or adviser',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'section_name', label: 'Section', minWidth: 150 },
      { field: 'grade_level_name', label: 'Grade level', minWidth: 150 },
      { field: 'academic_year_name', label: 'School year', minWidth: 140 },
      { field: 'teacher_name', label: 'Adviser', minWidth: 160 },
      { field: 'student_count', label: 'Students', minWidth: 100 },
    ],
    fields: [
      {
        name: 'section_id',
        label: 'Section',
        type: 'select',
        required: true,
        optionsSource: 'sections',
      },
      {
        name: 'academic_year_id',
        label: 'School year',
        type: 'select',
        required: true,
        optionsSource: 'academicYears',
      },
      {
        name: 'teacher_id',
        label: 'Adviser',
        type: 'select',
        required: true,
        optionsSource: 'teachers',
      },
    ],
    // Students are derived from enrolment (read-only) — never a form field.
    // ResourceFormDialog fetches the full record (with `students`) on edit
    // and renders whatever this returns below the form fields.
    renderDetail: (detailRecord, loading) =>
      createElement(ClassStudentsDetail, { detailRecord, loading }),
  },

  announcements: {
    key: 'announcements',
    label: 'Announcements',
    singular: 'Announcement',
    icon: 'Megaphone',
    // Not a person and not a login account, same as the other content
    // resources.
    displayName: (row) => row.title,
    searchHint: 'title or content',
    createsLoginAccount: false,
    deleteMessage: (name) =>
      `${name} will be permanently removed. This cannot be undone.`,
    columns: [
      { field: 'title', label: 'Title', minWidth: 220 },
      // Same labels the form and the dashboard use, so one audience is not
      // called "Everyone" in one place and "all" in another.
      {
        field: 'target_role',
        label: 'Audience',
        minWidth: 130,
        value: (row) =>
          ANNOUNCEMENT_AUDIENCE_OPTIONS.find((option) => option.value === row.target_role)?.label ||
          row.target_role,
      },
      { field: 'author_name', label: 'Author', minWidth: 160 },
      { field: 'created_at', label: 'Posted', type: 'date', minWidth: 150 },
    ],
    // author_name and created_at are server-owned (taken from the auth token
    // and the row's timestamp) — columns only, never form fields.
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 200 },
      {
        name: 'target_role',
        label: 'Audience',
        type: 'select',
        options: ANNOUNCEMENT_AUDIENCE_OPTIONS,
      },
      { name: 'content', label: 'Content', multiline: true, required: true, maxLength: 5000 },
      { name: 'image_id', label: 'Image', type: 'image' },
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
      { to: '/admin/sections', label: 'Section', icon: 'DoorOpen' },
      { to: '/admin/subjects', label: 'Subjects', icon: 'BookOpen' },
    ],
  },
  {
    key: 'schedule',
    label: 'Schedule Management',
    icon: 'CalendarClock',
    children: [{ to: '/admin/schedules', label: 'Schedule', icon: 'CalendarClock' }],
  },
  {
    key: 'class',
    label: 'Class Management',
    icon: 'Users2',
    children: [{ to: '/admin/classes', label: 'Class', icon: 'Users2' }],
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: 'MessageSquare',
    children: [
      { to: '/admin/announcements', label: 'Announcements', icon: 'Megaphone' },
      { to: '/admin/messages', label: 'Messages', icon: 'MessageSquare', badge: 'messages' },
    ],
  },
];
