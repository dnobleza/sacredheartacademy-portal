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

// Mirrors ACCESS_LEVELS in backend/src/utils/access-levels.js.
export const CASHIER_LEVEL_ID = 8;
export const REGISTRAR_LEVEL = 3;
export const SUPER_ADMIN_LEVEL = 4;

export const roleHome = (role) => ROLE_HOME[role] || '/';

export const roleLabel = (role) => ROLE_LABEL[role] || 'Member';

/**
 * Where a signed-in user belongs. A registrar is an admin by role, so role
 * alone would drop them on the full admin overview; the exact Lvl-3 match
 * sends them to their own portal while leaving Super Admin on /admin.
 */
export const portalHome = (user) => {
  if (!user) {
    return '/';
  }

  if (user.role === 'admin' && user.access_level?.level === REGISTRAR_LEVEL) {
    return '/registrar';
  }

  // Cashier shares level 2 with Laboratory Staff, so the id is what separates
  // them — the same reason the API guards on the id.
  if (user.role === 'admin' && user.access_level?.id === CASHIER_LEVEL_ID) {
    return '/cashier';
  }

  return roleHome(user.role);
};
