import { Router } from 'express';
import { createCourseSchema, updateCourseSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { idParam, me } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './service.js';

/** No login needed: the public home page lists published courses. */
export const publicRouter = Router();
publicRouter.get('/courses', async (_req, res) => {
  res.json({ courses: await service.publishedCourses() });
});

export const coursesRouter = Router();
coursesRouter.use(authenticate);

// Student: browse the catalogue.
coursesRouter.get('/', requirePermission('courses.view'), async (req, res) => {
  res.json({ courses: await service.publishedCourses(me(req)) });
});

// Admin: manage courses.
coursesRouter.get('/manage', requirePermission('courses.manage'), async (_req, res) => {
  res.json({ courses: await service.manageCourses() });
});
coursesRouter.post('/', requirePermission('courses.manage'), validateBody(createCourseSchema), async (req, res) => {
  const actor = (await prisma.user.findUniqueOrThrow({ where: { id: me(req) } })).name;
  res.status(201).json({ course: await service.createCourse(actor, req.body) });
});
coursesRouter.patch('/:id', requirePermission('courses.manage'), validateBody(updateCourseSchema), async (req, res) => {
  const actor = (await prisma.user.findUniqueOrThrow({ where: { id: me(req) } })).name;
  res.json({ course: await service.updateCourse(actor, idParam(req), req.body) });
});
