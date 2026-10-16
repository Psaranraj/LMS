import { describe, expect, it } from 'vitest';
import { changePasswordSchema, registerSchema } from './auth.js';

describe('auth schemas', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse({ name: 'Arun', email: 'a@b.com', password: 'longenough' }).success).toBe(true);
  });
  it('rejects a short password', () => {
    expect(registerSchema.safeParse({ name: 'Arun', email: 'a@b.com', password: 'short' }).success).toBe(false);
  });
  it('requires matching new passwords', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'longenough', confirmPassword: 'different' });
    expect(r.success).toBe(false);
  });
});
