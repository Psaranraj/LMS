import type { EnrollmentDetail, EnrollmentSummary, InstallmentDto, QuizQuestionDto, QuizResultDto, WeekDto } from '@lms/shared-types';
import { QUIZ_QUESTION_COUNT } from '@lms/shared-constants';
import type { EnrollInput, PayInstallmentInput, SubmitQuizInput } from '@lms/shared-validation';
import { audit } from '../../lib/audit.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { certificateDto, requestIfComplete } from '../certificates/service.js';

const include = {
  user: true,
  course: {
    include: {
      instructor: { select: { name: true } },
      weeks: {
        orderBy: { number: 'asc' },
        include: { lessons: { orderBy: { position: 'asc' } }, quiz: { include: { _count: { select: { questions: true } } } } },
      },
    },
  },
  installments: { orderBy: { number: 'asc' } },
  certificate: true,
} as const;

/** The first unpaid installment is DUE, later ones are UPCOMING. */
export function installmentStatuses(list: { paidAt: Date | null }[]): InstallmentDto['status'][] {
  let dueTaken = false;
  return list.map((i) => {
    if (i.paidAt) return 'PAID';
    if (!dueTaken) {
      dueTaken = true;
      return 'DUE';
    }
    return 'UPCOMING';
  });
}

/**
 * Each paid installment opens the next week. When the LAST installment
 * is paid, every remaining week opens.
 */
export function openWeekCount(paid: number, installmentCount: number, weekCount: number): number {
  return paid >= installmentCount ? weekCount : Math.min(paid, weekCount);
}

async function passedWeekIds(userId: number): Promise<Set<number>> {
  const rows = await prisma.quizAttempt.findMany({ where: { userId, passed: true }, select: { weekId: true }, distinct: ['weekId'] });
  return new Set(rows.map((r) => r.weekId));
}

type EnrollmentRow = NonNullable<Awaited<ReturnType<typeof loadEnrollment>>>;
const loadEnrollment = (where: { id: number; userId: number }) => prisma.enrollment.findFirst({ where, include });

function summary(e: EnrollmentRow, passed: Set<number>): EnrollmentSummary {
  const weekCount = e.course.weeks.length;
  const weeksPassed = e.course.weeks.filter((w) => passed.has(w.id)).length;
  const statuses = installmentStatuses(e.installments);
  return {
    id: e.id,
    courseId: e.courseId,
    courseTitle: e.course.title,
    instructorName: e.course.instructor?.name ?? null,
    planMonths: e.planMonths,
    totalFee: e.totalFee,
    weekCount,
    weeksPassed,
    progress: weekCount ? Math.round((weeksPassed / weekCount) * 100) : 0,
    paidCount: e.installments.filter((i) => i.paidAt).length,
    installments: e.installments.map((i, k) => ({
      number: i.number,
      amount: i.amount,
      dueDate: i.dueDate.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
      status: statuses[k],
    })),
    certificate: e.certificate ? certificateDto({ ...e.certificate, enrollment: { user: e.user, course: e.course } }) : null,
  };
}

function detail(e: EnrollmentRow, passed: Set<number>): EnrollmentDetail {
  const s = summary(e, passed);
  const open = openWeekCount(s.paidCount, e.installments.length, s.weekCount);
  const weeks: WeekDto[] = e.course.weeks.map((w, index) => {
    const isOpen = index + 1 <= open;
    return {
      id: w.id,
      number: index + 1,
      title: w.title,
      open: isOpen,
      passed: passed.has(w.id),
      quizReady: (w.quiz?._count.questions ?? 0) === QUIZ_QUESTION_COUNT,
      lessons: isOpen ? w.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, url: l.url, position: l.position })) : [],
    };
  });
  return { ...s, weeks };
}

export async function listEnrollments(userId: number): Promise<EnrollmentSummary[]> {
  const rows = await prisma.enrollment.findMany({ where: { userId }, include, orderBy: { id: 'asc' } });
  const passed = await passedWeekIds(userId);
  return rows.map((e) => summary(e, passed));
}

export async function getEnrollment(userId: number, id: number): Promise<EnrollmentDetail> {
  const e = await loadEnrollment({ id, userId });
  if (!e) throw new NotFoundError('Enrollment not found');
  return detail(e, await passedWeekIds(userId));
}

/** Joins a course and creates the installment plan (1 = full payment). */
export async function enroll(userId: number, input: EnrollInput): Promise<number> {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course || course.status !== 'PUBLISHED') throw new NotFoundError('Course not available');
  const already = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (already) throw new ConflictError('You are already enrolled in this course');

  const n = input.planMonths;
  const base = Math.floor(course.fee / n);
  const now = new Date();
  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId: course.id,
      planMonths: n,
      totalFee: course.fee,
      installments: {
        create: Array.from({ length: n }, (_, i) => ({
          number: i + 1,
          amount: i === n - 1 ? course.fee - base * (n - 1) : base, // last one carries the rounding
          dueDate: new Date(now.getFullYear(), now.getMonth() + i, now.getDate()),
        })),
      },
    },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await audit(user.name, `Enrolled in ${course.title} (${n === 1 ? 'full payment' : `${n} installments`})`);
  return enrollment.id;
}

/** Test-mode payment: marks the next unpaid installment as paid. A real gateway would be called here. */
export async function payNext(userId: number, enrollmentId: number, input: PayInstallmentInput): Promise<EnrollmentDetail> {
  const e = await loadEnrollment({ id: enrollmentId, userId });
  if (!e) throw new NotFoundError('Enrollment not found');
  const next = e.installments.find((i) => !i.paidAt);
  if (!next) throw new ConflictError('All installments are already paid');
  await prisma.installment.update({ where: { id: next.id }, data: { paidAt: new Date(), method: input.method } });
  await audit(e.user.name, `Paid installment ${next.number} of ${e.installments.length} for ${e.course.title}`);
  await requestIfComplete(enrollmentId);
  return getEnrollment(userId, enrollmentId);
}

// ---------------- weekly quiz ----------------

async function loadOpenWeek(userId: number, weekId: number) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: {
      course: { include: { weeks: { orderBy: { number: 'asc' }, select: { id: true } } } },
      quiz: { include: { questions: { orderBy: { position: 'asc' } } } },
    },
  });
  if (!week) throw new NotFoundError('Week not found');
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: week.courseId } },
    include: { installments: true, user: true },
  });
  if (!enrollment) throw new ForbiddenError('Enroll in this course first');
  const index = week.course.weeks.findIndex((w) => w.id === weekId);
  const open = openWeekCount(enrollment.installments.filter((i) => i.paidAt).length, enrollment.installments.length, week.course.weeks.length);
  if (index + 1 > open) throw new ForbiddenError('Pay the next installment to open this week');
  if (!week.quiz || week.quiz.questions.length !== QUIZ_QUESTION_COUNT) throw new NotFoundError('The quiz for this week is not ready yet');
  return { week, enrollment, weekNumber: index + 1 };
}

/** Questions WITHOUT the correct answers. */
export async function getQuiz(userId: number, weekId: number): Promise<{ title: string; questions: QuizQuestionDto[] }> {
  const { week, weekNumber } = await loadOpenWeek(userId, weekId);
  return {
    title: `Week ${weekNumber} quiz: ${week.title}`,
    questions: week.quiz!.questions.map((q) => ({ id: q.id, text: q.text, options: q.options as string[] })),
  };
}

/** Grades on the server. All 10 correct completes the week. */
export async function submitQuiz(userId: number, weekId: number, input: SubmitQuizInput): Promise<QuizResultDto> {
  const { week, enrollment, weekNumber } = await loadOpenWeek(userId, weekId);
  const questions = week.quiz!.questions;
  const corrections: QuizResultDto['corrections'] = [];
  questions.forEach((q, index) => {
    if (input.answers[index] !== q.correctIndex) corrections.push({ index, correctIndex: q.correctIndex });
  });
  const score = questions.length - corrections.length;
  const passed = corrections.length === 0;

  await prisma.quizAttempt.create({ data: { userId, weekId, score, passed } });
  if (passed) {
    await audit(enrollment.user.name, `Passed Week ${weekNumber} quiz in ${week.course.title}`);
    await requestIfComplete(enrollment.id);
  }
  return { score, total: questions.length, passed, corrections };
}
