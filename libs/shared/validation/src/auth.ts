import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@lms/shared-constants';

const password = z.string().min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Public registration always creates a Student. Instructors are created by an admin. */
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{7,15}$/, 'Enter a valid mobile number')
    .nullable()
    .optional(),
  /** Profile photo as a small data URL (about 1 MB max). null removes it. */
  avatarUrl: z.string().max(1_400_000).startsWith('data:image/').nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: password,
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
