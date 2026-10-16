import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@lms/shared-constants';

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  roleId: z.number().int().positive(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const setActiveSchema = z.object({ active: z.boolean() });

export const rolePermissionsSchema = z.object({ permissionKeys: z.array(z.string()) });

export const createCourseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  fee: z.number().int().positive(),
  weekCount: z.number().int().min(1).max(52),
  instructorId: z.number().int().positive().nullable().optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  instructorId: z.number().int().positive().nullable().optional(),
});

export const certificateTemplateSchema = z.object({
  institute: z.string().trim().min(1).max(120),
  signatory: z.string().trim().min(1).max(120),
});
