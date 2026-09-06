/**
 * Student sidebar navigation. Same shape as TEACHER_NAV in teacherResources.js:
 * icon names are resolved by PortalLayout's ICONS map, and groups nest their
 * entries under `children`.
 *
 * The E-Learning entries are deliberately present but unbuilt — courses,
 * lessons, quizzes and exams have no tables yet, so they land on an honest
 * placeholder rather than 404ing.
 */
export const STUDENT_NAV = [
  { to: '/student', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  { to: '/student/profile', label: 'My Profile', icon: 'UserCircle' },
  { to: '/student/classes', label: 'My Classes', icon: 'Users2' },
  { to: '/student/schedule', label: 'Schedule', icon: 'CalendarDays' },
  {
    key: 'e-learning',
    label: 'E-Learning',
    icon: 'BookOpen',
    children: [
      { to: '/student/courses', label: 'My Courses', icon: 'BookOpen' },
      { to: '/student/lessons', label: 'Lessons', icon: 'Presentation' },
      { to: '/student/materials', label: 'Learning Materials', icon: 'Folder' },
      { to: '/student/assignments', label: 'Assignments', icon: 'FileText' },
      { to: '/student/quizzes', label: 'Quizzes', icon: 'ClipboardCheck' },
      { to: '/student/exams', label: 'Exams', icon: 'GraduationCap' },
    ],
  },
  { to: '/student/grades', label: 'Grades', icon: 'ClipboardList' },
  { to: '/student/attendance', label: 'Attendance', icon: 'CalendarClock' },
  // Tuition is not in the drawn tree, but declaring a payment to the cashier
  // happens here and nowhere else.
  { to: '/student/billing', label: 'Tuition & Payments', icon: 'Wallet' },
  { to: '/student/announcements', label: 'Announcements', icon: 'Megaphone' },
  { to: '/student/messages', label: 'Messages', icon: 'MessageSquare', badge: 'messages' },
  { to: '/student/documents', label: 'Documents', icon: 'Folder' },
  { to: '/student/notifications', label: 'Notifications', icon: 'Bell' },
  { to: '/student/settings', label: 'Settings', icon: 'Settings' },
];
