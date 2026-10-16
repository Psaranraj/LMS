/**
 * The three built-in, non-deletable system roles. Custom roles can be
 * created later through the Role table; this list only names the seeded
 * defaults so the seed script and the frontend share one constant.
 */
export const SYSTEM_ROLE_NAMES = ['Admin', 'Instructor', 'Student'] as const;

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];
