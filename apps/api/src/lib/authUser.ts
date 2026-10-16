import type { AuthUser, PermissionKey } from '@lms/shared-types';
import { prisma } from './prisma.js';

const include = { role: { include: { rolePermissions: { include: { permission: true } } } } } as const;

export function findUserWithRole(where: { id?: number; email?: string }) {
  return prisma.user.findFirst({ where, include });
}
export type UserWithRole = NonNullable<Awaited<ReturnType<typeof findUserWithRole>>>;

/** Turns a database user into the safe shape the web app sees (no password hash). */
export function toAuthUser(u: UserWithRole): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    roleId: u.roleId,
    roleName: u.role.name,
    permissions: u.role.rolePermissions.map((rp) => rp.permission.key as PermissionKey),
    active: u.active,
  };
}
