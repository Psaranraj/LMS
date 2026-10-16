import { Router } from 'express';
import { createUserSchema, setActiveSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { idParam, me } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './service.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/', requirePermission('users.view'), async (_req, res) => {
  res.json({ users: await service.listUsers() });
});

usersRouter.post('/', requirePermission('users.manage'), validateBody(createUserSchema), async (req, res) => {
  const actor = (await prisma.user.findUniqueOrThrow({ where: { id: me(req) } })).name;
  res.status(201).json({ user: await service.createUser(actor, req.body) });
});

usersRouter.patch('/:id/active', requirePermission('users.manage'), validateBody(setActiveSchema), async (req, res) => {
  const actor = (await prisma.user.findUniqueOrThrow({ where: { id: me(req) } })).name;
  res.json({ user: await service.setActive(actor, me(req), idParam(req), req.body.active) });
});
