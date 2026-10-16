import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import type { LoginResponse } from '@lms/shared-types';
import { FAILED_LOGIN_LOCK_MINUTES, FAILED_LOGIN_LOCK_THRESHOLD } from '@lms/shared-constants';
import type { LoginInput, RegisterInput } from '@lms/shared-validation';
import { env } from '../../config/env.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../lib/errors.js';
import { sha256Hex } from '../../lib/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';
import { findUserWithRole, toAuthUser, type UserWithRole } from '../../lib/authUser.js';

const COOKIE = 'refresh_token';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/v1/auth',
  maxAge: THIRTY_DAYS,
};

/** Creates the access token (sent in JSON) and the refresh token (sent as an httpOnly cookie). */
async function issueSession(user: UserWithRole, req: Request, res: Response): Promise<LoginResponse> {
  const authUser = toAuthUser(user);
  const accessToken = signAccessToken({
    sub: user.id,
    roleId: user.roleId,
    roleName: authUser.roleName,
    permissions: authUser.permissions,
  });
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + THIRTY_DAYS),
      userAgent: req.get('user-agent')?.slice(0, 255),
      ipAddress: req.ip,
    },
  });
  res.cookie(COOKIE, refreshToken, cookieOptions);
  return { accessToken, user: authUser };
}

export async function register(input: RegisterInput, req: Request, res: Response) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ConflictError('This email is already registered');
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Student' } });
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS),
      roleId: role.id,
    },
  });
  const user = (await findUserWithRole({ id: created.id }))!;
  return issueSession(user, req, res);
}

export async function login(input: LoginInput, req: Request, res: Response) {
  const user = await findUserWithRole({ email: input.email });
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError('Too many wrong attempts. Try again in a few minutes.');
  }
  if (!user.active) throw new ForbiddenError('This account is disabled');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    const lock = attempts >= FAILED_LOGIN_LOCK_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + FAILED_LOGIN_LOCK_MINUTES * 60_000) : null,
      },
    });
    throw new UnauthorizedError('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return issueSession(user, req, res);
}

/** Swaps the refresh cookie for a new access token. The old refresh token is used up (rotation). */
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) throw new UnauthorizedError('No session');
  try {
    verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Session expired');
  }
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) throw new UnauthorizedError('Session expired');

  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  const user = await findUserWithRole({ id: row.userId });
  if (!user || !user.active) throw new UnauthorizedError('Session expired');
  return issueSession(user, req, res);
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256Hex(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.clearCookie(COOKIE, { path: cookieOptions.path });
}

export async function currentUser(userId: number) {
  const user = await findUserWithRole({ id: userId });
  if (!user || !user.active) throw new UnauthorizedError('Session expired');
  return toAuthUser(user);
}
