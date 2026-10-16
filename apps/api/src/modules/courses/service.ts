import type { CourseCard } from '@lms/shared-types';
import type { CreateCourseInput } from '@lms/shared-validation';
import { audit } from '../../lib/audit.js';
import { NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const card = (c: { id: number; title: string; description: string; fee: number; instructor: { name: string } | null; _count: { weeks: number } }): CourseCard => ({
  id: c.id,
  title: c.title,
  description: c.description,
  fee: c.fee,
  weekCount: c._count.weeks,
  instructorName: c.instructor?.name ?? null,
});
const include = { instructor: { select: { name: true } }, _count: { select: { weeks: true } } } as const;

/** Published courses. `userId` marks the ones the student already joined. */
export async function publishedCourses(userId?: number): Promise<CourseCard[]> {
  const courses = await prisma.course.findMany({ where: { status: 'PUBLISHED' }, include, orderBy: { id: 'asc' } });
  const mine = userId
    ? new Set((await prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } })).map((e) => e.courseId))
    : new Set<number>();
  return courses.map((c) => ({ ...card(c), enrolled: mine.has(c.id) }));
}

/** Admin view: every course with its status. */
export async function manageCourses() {
  const courses = await prisma.course.findMany({ include, orderBy: { id: 'asc' } });
  return courses.map((c) => ({ ...card(c), status: c.status, instructorId: c.instructorId }));
}

export async function createCourse(actor: string, input: CreateCourseInput) {
  const course = await prisma.course.create({
    data: {
      title: input.title,
      description: input.description,
      fee: input.fee,
      instructorId: input.instructorId ?? null,
      weeks: { create: Array.from({ length: input.weekCount }, (_, i) => ({ number: i + 1, title: `Week ${i + 1}` })) },
    },
  });
  await audit(actor, `Created course ${course.title}`);
  return course;
}

export async function updateCourse(actor: string, id: number, data: { status?: 'DRAFT' | 'PUBLISHED'; instructorId?: number | null }) {
  if (!(await prisma.course.findUnique({ where: { id } }))) throw new NotFoundError('Course not found');
  const course = await prisma.course.update({ where: { id }, data });
  await audit(actor, `Updated course ${course.title}${data.status ? ` (${data.status})` : ''}`);
  return course;
}
