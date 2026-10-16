import type { NextFunction, Request, Response } from 'express';
import type { PermissionKey } from '@lms/shared-types';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

/**
 * Real, server-side authorization — checked on every guarded route
 * regardless of what the frontend hides. `anyOf` matches if the user's
 * token carries at least one of the given keys.
 */
export function requirePermission(...anyOf: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    const hasPermission = anyOf.some((key) => req.user!.permissions.includes(key));
    if (!hasPermission) {
      return next(new ForbiddenError(`Missing permission: ${anyOf.join(' or ')}`));
    }
    next();
  };
}
