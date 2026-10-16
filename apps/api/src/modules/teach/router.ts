import { Router } from 'express';
import type { AccessTokenPayload, QuizEditQuestion, TeachCourse, TeachStudentRow, TeachWeek } from '@lms/shared-types';
import { lessonSchema, quizEditSchema, weekTitleSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { audit } from '../../lib/audit.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { idParam, me } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';

/** Instructor workspace: weeks, lessons, quizzes and own students. Admin (courses.manage) can reach every course. */
export const teachRouter = Router();
teachRouter.use(authenticate);

const sees = (user: AccessTokenPayload) => (user.permissions.includes('courses.manage') ? {} : { instructorId: user.sub });

async function ownCourse(user: AccessTokenPayload, courseId: number) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError('Course not found');
  if (!user.permissions.includes('courses.manage') && course.instructorId !== user.sub) throw new ForbiddenError('This is not your course');
  return course;
}
async function ownWeek(user: AccessTokenPayload, weekId: number) {
  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week) throw new NotFoundError('Week not found');
  await ownCourse(user, week.courseId);
  return week;
}
const actor = async (id: number) => (await prisma.user.findUniqueOrThrow({ where: { id } })).name;

// ---- courses and structure
teachRouter.get('/courses', requirePermission('lessons.manage'), async (req, res) => {
  const courses = await prisma.course.findMany({
    where: sees(req.user!),
    include: { _count: { select: { weeks: true, enrollments: true } } },
    orderBy: { id: 'asc' },
  });
  const list: TeachCourse[] = courses.map((c) => ({ id: c.id, title: c.title, status: c.status, weekCount: c._count.weeks, studentCount: c._count.enrollments }));
  res.json({ courses: list });
});

teachRouter.get('/courses/:id', requirePermission('lessons.manage'), async (req, res) => {
  const course = await ownCourse(req.user!, idParam(req));
  const weeks = await prisma.week.findMany({
    where: { courseId: course.id },
    orderBy: { number: 'asc' },
    include: { lessons: { orderBy: { position: 'asc' } }, quiz: { include: { _count: { select: { questions: true } } } } },
  });
  const out: TeachWeek[] = weeks.map((w) => ({
    id: w.id,
    number: w.number,
    title: w.title,
    quizReady: (w.quiz?._count.questions ?? 0) === 10,
    lessons: w.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, url: l.url, position: l.position })),
  }));
  res.json({ course: { id: course.id, title: course.title }, weeks: out });
});

// ---- weeks
teachRouter.post('/courses/:id/weeks', requirePermission('lessons.manage'), validateBody(weekTitleSchema), async (req, res) => {
  const course = await ownCourse(req.user!, idParam(req));
  const last = await prisma.week.findFirst({ where: { courseId: course.id }, orderBy: { number: 'desc' } });
  const week = await prisma.week.create({ data: { courseId: course.id, number: (last?.number ?? 0) + 1, title: req.body.title } });
  res.status(201).json({ id: week.id });
});
teachRouter.patch('/weeks/:id', requirePermission('lessons.manage'), validateBody(weekTitleSchema), async (req, res) => {
  const week = await ownWeek(req.user!, idParam(req));
  await prisma.week.update({ where: { id: week.id }, data: { title: req.body.title } });
  res.status(204).end();
});

// ---- lessons
teachRouter.post('/weeks/:id/lessons', requirePermission('lessons.manage'), validateBody(lessonSchema), async (req, res) => {
  const week = await ownWeek(req.user!, idParam(req));
  const last = await prisma.lesson.findFirst({ where: { weekId: week.id }, orderBy: { position: 'desc' } });
  const lesson = await prisma.lesson.create({ data: { ...req.body, weekId: week.id, position: (last?.position ?? 0) + 1 } });
  res.status(201).json({ id: lesson.id });
});
teachRouter.delete('/lessons/:id', requirePermission('lessons.manage'), async (req, res) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: idParam(req) } });
  if (!lesson) throw new NotFoundError('Lesson not found');
  await ownWeek(req.user!, lesson.weekId);
  await prisma.lesson.delete({ where: { id: lesson.id } });
  res.status(204).end();
});

// ---- weekly quiz (10 MCQ)
teachRouter.get('/weeks/:id/quiz', requirePermission('quizzes.manage'), async (req, res) => {
  const week = await ownWeek(req.user!, idParam(req));
  const quiz = await prisma.quiz.findUnique({ where: { weekId: week.id }, include: { questions: { orderBy: { position: 'asc' } } } });
  const questions: QuizEditQuestion[] = (quiz?.questions ?? []).map((q) => ({ text: q.text, options: q.options as string[], correctIndex: q.correctIndex }));
  res.json({ weekTitle: week.title, weekNumber: week.number, questions });
});
teachRouter.put('/weeks/:id/quiz', requirePermission('quizzes.manage'), validateBody(quizEditSchema), async (req, res) => {
  const week = await ownWeek(req.user!, idParam(req));
  const questions = req.body.questions as QuizEditQuestion[];
  await prisma.$transaction(async (tx) => {
    const quiz = await tx.quiz.upsert({ where: { weekId: week.id }, update: {}, create: { weekId: week.id } });
    await tx.question.deleteMany({ where: { quizId: quiz.id } });
    await tx.question.createMany({
      data: questions.map((q, i) => ({ quizId: quiz.id, position: i + 1, text: q.text, options: q.options, correctIndex: q.correctIndex })),
    });
  });
  await audit(await actor(me(req)), `Saved Week ${week.number} quiz`);
  res.status(204).end();
});

// ---- own students (progress per weekly quiz + payments)
teachRouter.get('/students', requirePermission('students.view'), async (req, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { course: sees(req.user!) },
    include: { user: true, course: { include: { weeks: { orderBy: { number: 'asc' }, select: { id: true } } } }, installments: true },
    orderBy: { id: 'asc' },
  });
  const rows: TeachStudentRow[] = [];
  for (const e of enrollments) {
    const passed = new Set(
      (await prisma.quizAttempt.findMany({ where: { userId: e.userId, passed: true }, select: { weekId: true }, distinct: ['weekId'] })).map((a) => a.weekId),
    );
    const weekPassed = e.course.weeks.map((w) => passed.has(w.id));
    rows.push({
      enrollmentId: e.id,
      studentName: e.user.name,
      email: e.user.email,
      courseTitle: e.course.title,
      weekPassed,
      progress: weekPassed.length ? Math.round((weekPassed.filter(Boolean).length / weekPassed.length) * 100) : 0,
      paidCount: e.installments.filter((i) => i.paidAt).length,
      installmentCount: e.installments.length,
    });
  }
  res.json({ students: rows });
});
