import bcrypt from 'bcryptjs';
import type { ChangePasswordInput, UpdateProfileInput } from '@lms/shared-validation';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { findUserWithRole, toAuthUser } from '../../lib/authUser.js';
import { audit } from '../../lib/audit.js';
import { prisma } from '../../lib/prisma.js';

export async function updateProfile(userId: number, input: UpdateProfileInput) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone === undefined ? undefined : input.phone || null,
      avatarUrl: input.avatarUrl === undefined ? undefined : input.avatarUrl,
    },
  });
  return toAuthUser((await findUserWithRole({ id: userId }))!);
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new UnauthorizedError('Current password is wrong');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS) },
  });
  // Other devices must log in again.
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(user.name, 'Changed password');
}
