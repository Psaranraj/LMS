import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { me } from '../../lib/params.js';
import * as service from './service.js';

export const profileRouter = Router();
profileRouter.use(authenticate); // every signed-in role can edit their own profile

profileRouter.patch('/', validateBody(updateProfileSchema), async (req, res) => {
  res.json({ user: await service.updateProfile(me(req), req.body) });
});

profileRouter.post('/password', validateBody(changePasswordSchema), async (req, res) => {
  await service.changePassword(me(req), req.body);
  res.status(204).end();
});
