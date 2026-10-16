import { Router } from 'express';
import type { RoleRow } from '@lms/shared-types';
import { PERMISSION_KEYS } from '@lms/shared-types';
import { rolePermissionsSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { audit } from '../../lib/audit.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { idParam, me } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';

export const rolesRouter = Router();
rolesRouter.use(authenticate);

async function rolesWithKeys(): Promise<RoleRow[]> {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { id: 'asc' },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    isSystem: r.isSystem,
    permissionKeys: r.rolePermissions.map((rp) => rp.permission.key),
  }));
}

// Users page needs the role list for its "Add user" form, so users.view is enough to read it.
rolesRouter.get('/', requirePermission('roles.manage', 'users.view'), async (_req, res) => {
  res.json({ roles: await rolesWithKeys() });
});

// Replaces the whole permission set of one role. The Admin role is locked.
rolesRouter.put('/:id/permissions', requirePermission('roles.manage'), validateBody(rolePermissionsSchema), async (req, res) => {
  const id = idParam(req);
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError('Role not found');
  if (role.name === 'Admin') throw new ForbiddenError('The Admin role cannot be changed');

  const keys = (req.body.permissionKeys as string[]).filter((k) => (PERMISSION_KEYS as readonly string[]).includes(k));
  const permissions = await prisma.permission.findMany({ where: { key: { in: keys } } });
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) }),
  ]);
  const actor = await prisma.user.findUniqueOrThrow({ where: { id: me(req) } });
  await audit(actor.name, `Changed ${role.name} permissions`);
  res.json({ roles: await rolesWithKeys() });
});
