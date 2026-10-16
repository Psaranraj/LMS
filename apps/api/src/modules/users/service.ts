import bcrypt from 'bcryptjs';
import type { UserRow } from '@lms/shared-types';
import type { CreateUserInput } from '@lms/shared-validation';
import { env } from '../../config/env.js';
import { audit } from '../../lib/audit.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const row = (u: { id: number; name: string; email: string; roleId: number; active: boolean; role: { name: string } }): UserRow => ({
  id: u.id,
  name: u.name,
  email: u.email,
  roleId: u.roleId,
  roleName: u.role.name,
  active: u.active,
});

export async function listUsers(): Promise<UserRow[]> {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { id: 'asc' } });
  return users.map(row);
}

/** Admin creates accounts here (this is how Instructors are made). */
export async function createUser(actor: string, input: CreateUserInput): Promise<UserRow> {
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw new ConflictError('Email already exists');
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      roleId: input.roleId,
      passwordHash: await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS),
    },
    include: { role: true },
  });
  await audit(actor, `Created ${user.role.name} ${user.name}`);
  return row(user);
}

export async function setActive(actor: string, actorId: number, id: number, active: boolean): Promise<UserRow> {
  if (id === actorId) throw new ForbiddenError('You cannot disable your own account');
  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError('User not found');
  const user = await prisma.user.update({ where: { id }, data: { active }, include: { role: true } });
  if (!active) await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(actor, `${active ? 'Enabled' : 'Disabled'} ${user.name}`);
  return row(user);
}
