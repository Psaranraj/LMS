/**
 * Canonical permission key catalogue. Single source of truth for RBAC:
 * the Prisma seed, the Express requirePermission() middleware and the
 * React PermissionGate all use these exact strings.
 */

export const PERMISSION_RESOURCES = [
  'dashboard',
  'courses',
  'lessons',
  'quizzes',
  'learning',
  'payments',
  'students',
  'certificates',
  'users',
  'roles',
  'audit',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export interface PermissionDefinition {
  key: string;
  resource: PermissionResource;
  description: string;
}

export const PERMISSIONS = [
  { key: 'dashboard.view', resource: 'dashboard', description: 'View the dashboard' },

  { key: 'courses.view', resource: 'courses', description: 'Browse the course catalogue' },
  { key: 'courses.manage', resource: 'courses', description: 'Create courses, set fees and assign instructors' },

  { key: 'lessons.manage', resource: 'lessons', description: 'Build weeks, lessons and materials' },

  { key: 'quizzes.manage', resource: 'quizzes', description: 'Create and edit weekly quizzes' },
  { key: 'quizzes.take', resource: 'quizzes', description: 'Take weekly quizzes' },

  { key: 'learning.access', resource: 'learning', description: 'Study enrolled courses' },

  { key: 'payments.pay', resource: 'payments', description: 'Pay own installments' },
  { key: 'payments.view_all', resource: 'payments', description: 'View all payments' },

  { key: 'students.view', resource: 'students', description: 'View students and their progress' },

  { key: 'certificates.view_own', resource: 'certificates', description: 'View and download own certificates' },
  { key: 'certificates.approve', resource: 'certificates', description: 'Approve or reject certificate requests' },
  { key: 'certificates.manage_template', resource: 'certificates', description: 'Edit the certificate template and revoke certificates' },

  { key: 'users.view', resource: 'users', description: 'View the user list' },
  { key: 'users.manage', resource: 'users', description: 'Create, disable and assign roles to users' },
  { key: 'roles.manage', resource: 'roles', description: 'Edit roles and their permissions' },
  { key: 'audit.view', resource: 'audit', description: 'View the audit log' },
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);
