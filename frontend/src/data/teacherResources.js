/**
 * Teacher sidebar navigation. Same shape as ADMIN_NAV in adminResources.js —
 * icons are names resolved by PortalLayout's ICONS map, and groups nest their
 * entries under `children`. No minAccessLevel keys: access levels gate admin
 * screens only, and a teacher's own portal is not tiered.
 */
export const TEACHER_NAV = [
  { to: '/teacher', label: 'Overview', icon: 'LayoutDashboard', end: true },
  { to: '/teacher/profile', label: 'Profile', icon: 'UserCircle' },
  {
    key: 'my-classes',
    label: 'My Classes',
    icon: 'Users2',
    children: [
      { to: '/teacher/classes', label: 'Classes', icon: 'Users2' },
      { to: '/teacher/students', label: 'Students', icon: 'GraduationCap' },
    ],
  },
  {
    key: 'academic',
    label: 'Academic',
    icon: 'ClipboardList',
    children: [
      { to: '/teacher/attendance', label: 'Attendance', icon: 'ClipboardCheck' },
      { to: '/teacher/grades', label: 'Grades', icon: 'ClipboardList' },
      { to: '/teacher/assignments', label: 'Assignments', icon: 'FileText' },
    ],
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: 'MessageSquare',
    // No Announcements entry: posting announcements is an admin-only action.
    // Teachers read them on the overview feed instead.
    children: [{ to: '/teacher/messages', label: 'Messages', icon: 'MessageSquare', badge: 'messages' }],
  },
];
