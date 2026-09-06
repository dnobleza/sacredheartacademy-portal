/**
 * Cashier sidebar. Same shape as the other portals — icon names are resolved
 * by PortalLayout's ICONS map, and groups nest under `children`.
 */
export const CASHIER_NAV = [
  { to: '/cashier', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
  { to: '/cashier/profile', label: 'Profile', icon: 'UserCircle' },
  {
    key: 'payments',
    label: 'Payments',
    icon: 'Wallet',
    children: [
      { to: '/cashier/payments/new', label: 'New Payment', icon: 'Banknote' },
      { to: '/cashier/payments', label: 'Payment History', icon: 'ReceiptText' },
      {
        to: '/cashier/confirmations',
        label: 'Payment Confirmations',
        icon: 'ReceiptText',
        badge: 'declarations',
      },
    ],
  },
  { to: '/cashier/students', label: 'Student Accounts', icon: 'GraduationCap' },
  { to: '/cashier/outstanding', label: 'Outstanding Balances', icon: 'AlertTriangle' },
  { to: '/cashier/receipts', label: 'Receipts', icon: 'ReceiptText' },
  { to: '/cashier/session', label: 'Cashier Session', icon: 'Wallet' },
  {
    key: 'reports',
    label: 'Reports',
    icon: 'ClipboardList',
    children: [
      { to: '/cashier/reports/daily', label: 'Daily Collection', icon: 'CalendarDays' },
      { to: '/cashier/reports/monthly', label: 'Monthly Collection', icon: 'CalendarRange' },
      { to: '/cashier/reports/summary', label: 'Collection Summary', icon: 'ClipboardList' },
    ],
  },
  { to: '/cashier/notifications', label: 'Notifications', icon: 'Bell' },
];
