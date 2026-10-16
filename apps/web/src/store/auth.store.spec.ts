import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser } from '@lms/shared-types';
import { useAuthStore } from './auth.store';

const student: AuthUser = {
  id: 1,
  name: 'Arun',
  email: 'arun@example.com',
  phone: null,
  avatarUrl: null,
  roleId: 3,
  roleName: 'Student',
  permissions: ['courses.view', 'learning.access'],
  active: true,
};

describe('auth store', () => {
  beforeEach(() => useAuthStore.getState().clearSession());

  it('has no permissions when logged out', () => {
    expect(useAuthStore.getState().hasPermission('courses.view')).toBe(false);
  });

  it('checks any-of permissions for the logged-in user', () => {
    useAuthStore.getState().setSession('token', student);
    expect(useAuthStore.getState().hasPermission('users.manage', 'learning.access')).toBe(true);
    expect(useAuthStore.getState().hasPermission('users.manage')).toBe(false);
  });
});
