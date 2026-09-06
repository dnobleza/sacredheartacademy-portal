/**
 * Registrar sidebar navigation. Same shape as ADMIN_NAV in adminResources.js —
 * icons are names resolved by PortalLayout's ICONS map, and groups nest their
 * entries under `children`.
 *
 * A registrar is an admin by role, so the enrolment and communication screens
 * reuse the existing admin pages — App.jsx mounts those same components under
 * /registrar so the sidebar stays put instead of switching portals mid-task.
 */
export const REGISTRAR_NAV = [
  { to: '/registrar', label: 'Overview', icon: 'LayoutDashboard', end: true },
  { to: '/registrar/profile', label: 'Profile', icon: 'UserCircle' },
  {
    key: 'admissions',
    label: 'Admissions',
    icon: 'ClipboardList',
    children: [{ to: '/registrar/admissions', label: 'Applications', icon: 'ClipboardList' }],
  },
  {
    key: 'enrollment',
    label: 'Enrollment',
    icon: 'GraduationCap',
    // Placing students is the registrar's job; creating the students, sections,
    // grade levels and school years they are placed into is Super Admin only.
    children: [{ to: '/registrar/enrollment', label: 'Enrollment', icon: 'ClipboardCheck' }],
  },
  {
    key: 'records',
    label: 'Records',
    icon: 'FileText',
    children: [{ to: '/registrar/records', label: 'Records Requests', icon: 'FileText' }],
  },
  {
    key: 'communication',
    label: 'Communication',
    icon: 'MessageSquare',
    children: [
      { to: '/registrar/announcements', label: 'Announcements', icon: 'Megaphone' },
      { to: '/registrar/messages', label: 'Messages', icon: 'MessageSquare', badge: 'messages' },
    ],
  },
];
