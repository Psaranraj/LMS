import type { PermissionKey } from './permissions.js';

/** Decoded shape of the short-lived JWT access token payload. */
export interface AccessTokenPayload {
  sub: number;
  roleId: number;
  roleName: string;
  permissions: PermissionKey[];
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  roleId: number;
  roleName: string;
  permissions: PermissionKey[];
  active: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}
