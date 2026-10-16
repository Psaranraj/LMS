import type { PermissionKey } from '@lms/shared-types';
import { useAuthStore } from '../../store/auth.store';

/** Reactive permission check — re-renders when the user's permission set changes (e.g. after a role edit forces re-login). */
export function useHasPermission(...anyOf: PermissionKey[]): boolean {
  return useAuthStore((s) => {
    const user = s.user;
    return user ? anyOf.some((key) => user.permissions.includes(key)) : false;
  });
}
