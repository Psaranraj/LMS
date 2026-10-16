import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload } from '@lms/shared-types';
import { env } from '../config/env.js';

type AccessTokenClaims = Omit<AccessTokenPayload, 'iat' | 'exp'>;

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
}

export function signRefreshToken(userId: number): string {
  // jti keeps two tokens issued in the same second unique (the hash is a unique column).
  return jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyRefreshToken(token: string): { sub: number } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as { sub: number };
}
