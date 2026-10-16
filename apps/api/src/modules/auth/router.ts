import { Router } from 'express';
import { loginSchema, registerSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { validateBody } from '../../middleware/validate.js';
import * as c from './controller.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), c.register);
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), c.login);
authRouter.post('/refresh', c.refresh);
authRouter.post('/logout', c.logout);
authRouter.get('/me', authenticate, c.currentUser);
