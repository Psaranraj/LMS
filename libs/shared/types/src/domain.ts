import type { CertificateStatus, LessonType } from './enums.js';

/**
 * Response shapes (DTOs) sent by the API and read by the web app.
 * Dates travel as ISO strings because JSON has no Date type.
 */

export interface CourseCard {
  id: number;
  title: string;
  description: string;
  fee: number;
  weekCount: number;
  instructorName: string | null;
  enrolled?: boolean;
}

export interface InstallmentDto {
  number: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'PAID' | 'DUE' | 'UPCOMING';
}

export interface CertificateDto {
  id: number;
  status: CertificateStatus;
  code: string;
  reason: string | null;
  courseTitle: string;
  studentName: string;
  issuedAt: string | null;
}

export interface LessonDto {
  id: number;
  title: string;
  type: LessonType;
  url: string;
  position: number;
}

export interface WeekDto {
  id: number;
  number: number;
  title: string;
  /** Opens when the matching installment is paid. */
  open: boolean;
  /** True once the weekly quiz was passed with 10 of 10. */
  passed: boolean;
  quizReady: boolean;
  /** Empty while the week is locked. */
  lessons: LessonDto[];
}

export interface EnrollmentSummary {
  id: number;
  courseId: number;
  courseTitle: string;
  instructorName: string | null;
  planMonths: number;
  totalFee: number;
  weekCount: number;
  weeksPassed: number;
  /** weeksPassed / weekCount as a whole percentage. */
  progress: number;
  paidCount: number;
  installments: InstallmentDto[];
  certificate: CertificateDto | null;
}

export interface EnrollmentDetail extends EnrollmentSummary {
  weeks: WeekDto[];
}

export interface QuizQuestionDto {
  id: number;
  text: string;
  options: string[];
}

export interface QuizResultDto {
  score: number;
  total: number;
  passed: boolean;
  /** Only the wrong questions are revealed: question index -> correct option index. */
  corrections: { index: number; correctIndex: number }[];
}

export interface QuizEditQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface TeachCourse {
  id: number;
  title: string;
  status: string;
  weekCount: number;
  studentCount: number;
}

export interface TeachWeek {
  id: number;
  number: number;
  title: string;
  quizReady: boolean;
  lessons: LessonDto[];
}

export interface TeachStudentRow {
  enrollmentId: number;
  studentName: string;
  email: string;
  courseTitle: string;
  weekPassed: boolean[];
  progress: number;
  paidCount: number;
  installmentCount: number;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName: string;
  active: boolean;
}

export interface RoleRow {
  id: number;
  name: string;
  isSystem: boolean;
  permissionKeys: string[];
}

export interface AdminPaymentRow {
  id: number;
  studentName: string;
  courseTitle: string;
  number: number;
  installmentCount: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'PAID' | 'DUE' | 'UPCOMING';
}

export interface AuditRow {
  id: number;
  actorName: string;
  action: string;
  createdAt: string;
}

export interface CertificateTemplateDto {
  institute: string;
  signatory: string;
}

export interface AdminStats {
  users: number;
  courses: number;
  collected: number;
  pending: number;
  recentPayments: AdminPaymentRow[];
  recentActivity: AuditRow[];
}
