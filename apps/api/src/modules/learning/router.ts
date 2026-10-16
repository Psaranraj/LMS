import { Router } from 'express';
import { enrollSchema, payInstallmentSchema, submitQuizSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { idParam, me } from '../../lib/params.js';
import * as service from './service.js';

/** Everything a student does: enroll, study, pay, take quizzes. */
export const learningRouter = Router();
learningRouter.use(authenticate);

learningRouter.get('/enrollments', requirePermission('learning.access'), async (req, res) => {
  res.json({ enrollments: await service.listEnrollments(me(req)) });
});
learningRouter.get('/enrollments/:id', requirePermission('learning.access'), async (req, res) => {
  res.json({ enrollment: await service.getEnrollment(me(req), idParam(req)) });
});
learningRouter.post('/enrollments', requirePermission('payments.pay'), validateBody(enrollSchema), async (req, res) => {
  res.status(201).json({ id: await service.enroll(me(req), req.body) });
});
learningRouter.post('/enrollments/:id/pay', requirePermission('payments.pay'), validateBody(payInstallmentSchema), async (req, res) => {
  res.json({ enrollment: await service.payNext(me(req), idParam(req), req.body) });
});

learningRouter.get('/weeks/:weekId/quiz', requirePermission('quizzes.take'), async (req, res) => {
  res.json(await service.getQuiz(me(req), idParam(req, 'weekId')));
});
learningRouter.post('/weeks/:weekId/quiz', requirePermission('quizzes.take'), validateBody(submitQuizSchema), async (req, res) => {
  res.json(await service.submitQuiz(me(req), idParam(req, 'weekId'), req.body));
});
