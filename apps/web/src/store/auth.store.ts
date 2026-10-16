import { create } from 'zustand';
import type { AuthUser, PermissionKey } from '@lms/shared-types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** True once the initial "am I already logged in" check (via /auth/refresh) has resolved. */
  hydrated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setHydrated: () => void;
  hasPermission: (...anyOf: PermissionKey[]) => boolean;
}

// Access token lives only in memory (never localStorage) — see plan's auth strategy.
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  hydrated: false,

  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  setHydrated: () => set({ hydrated: true }),

  hasPermission: (...anyOf) => {
    const user = get().user;
    if (!user) return false;
    return anyOf.some((key) => user.permissions.includes(key));
  },
}));
