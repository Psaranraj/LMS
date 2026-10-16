/**
 * String-literal mirrors of the Prisma enums added in later phases.
 * Keep these in sync with schema.prisma. Frontend and backend both import them.
 */

export const COURSE_STATUS = ['DRAFT', 'PUBLISHED'] as const;
export type CourseStatus = (typeof COURSE_STATUS)[number];

export const INSTALLMENT_STATUS = ['UPCOMING', 'DUE', 'PAID'] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUS)[number];

export const CERTIFICATE_STATUS = ['REQUESTED', 'ISSUED', 'REJECTED', 'REVOKED'] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUS)[number];

export const LESSON_TYPES = ['VIDEO', 'PDF', 'SLIDES'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];
