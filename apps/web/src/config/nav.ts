import type { PermissionKey } from '@lms/shared-types';

export interface NavItem {
  to: string;
  label: string;
  /** Item is shown when the user holds ANY of these. Empty means everyone who is logged in. */
  anyOf: PermissionKey[];
}

/** One list for every role. What a user sees depends only on their permissions. */
export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', anyOf: ['dashboard.view'] },
  // student
  { to: '/courses', label: 'Browse courses', anyOf: ['learning.access'] },
  { to: '/my-courses', label: 'My courses', anyOf: ['learning.access'] },
  { to: '/payments', label: 'Payments', anyOf: ['payments.pay'] },
  { to: '/certificates', label: 'Certificates', anyOf: ['certificates.view_own'] },
  // instructor
  { to: '/teach', label: 'My courses', anyOf: ['lessons.manage'] },
  { to: '/students', label: 'Students', anyOf: ['students.view'] },
  // admin
  { to: '/users', label: 'Users', anyOf: ['users.view'] },
  { to: '/manage/courses', label: 'Courses', anyOf: ['courses.manage'] },
  { to: '/all-payments', label: 'Payments', anyOf: ['payments.view_all'] },
  { to: '/certificate-admin', label: 'Certificates', anyOf: ['certificates.manage_template'] },
  { to: '/roles', label: 'Roles', anyOf: ['roles.manage'] },
  { to: '/audit', label: 'Audit log', anyOf: ['audit.view'] },
  // everyone
  { to: '/settings', label: 'Settings', anyOf: [] },
];
