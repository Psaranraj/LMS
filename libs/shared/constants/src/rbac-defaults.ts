import type { PermissionKey, SystemRoleName } from '@lms/shared-types';

/**
 * Default permission grants seeded for each system role. Admin gets
 * the management permissions only (it does not study, pay or approve). All of this stays editable later by anyone with
 * `roles.manage`; this is only the seed.
 */
export const SYSTEM_ROLE_DEFAULT_GRANTS: Record<SystemRoleName, PermissionKey[] | 'ALL'> = {
  Admin: [
    'dashboard.view',
    'courses.manage',
    'payments.view_all',
    'certificates.manage_template',
    'users.view',
    'users.manage',
    'roles.manage',
    'audit.view',
  ],

  Instructor: [
    'dashboard.view',
    'courses.view',
    'lessons.manage',
    'quizzes.manage',
    'students.view',
    'certificates.approve',
  ],

  Student: [
    'dashboard.view',
    'courses.view',
    'learning.access',
    'quizzes.take',
    'payments.pay',
    'certificates.view_own',
  ],
};
