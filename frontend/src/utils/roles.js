/**
 * Single source of truth mapping a role to its portal home. Roles always come
 * from the server response — never inferred client-side.
 */
export const ROLE_HOME = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

export const ROLE_LABEL = {
  admin: 'Administrator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export const roleHome = (role) => ROLE_HOME[role] || '/';

export const roleLabel = (role) => ROLE_LABEL[role] || 'Member';
