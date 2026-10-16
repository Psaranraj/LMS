import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { adminRouter } from '../modules/admin/router.js';
import { authRouter } from '../modules/auth/router.js';
import { certificatesRouter } from '../modules/certificates/router.js';
import { coursesRouter, publicRouter } from '../modules/courses/router.js';
import { learningRouter } from '../modules/learning/router.js';
import { profileRouter } from '../modules/profile/router.js';
import { rolesRouter } from '../modules/roles/router.js';
import { teachRouter } from '../modules/teach/router.js';
import { usersRouter } from '../modules/users/router.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '2mb' })); // profile photos travel as small data URLs
  app.use(cookieParser());
  app.use(pinoHttp());

  const api = express.Router();
  api.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  api.use('/public', publicRouter); // no login
  api.use('/auth', authRouter); // register, login, refresh, logout, me
  api.use('/profile', profileRouter); // settings: name, phone, photo, password
  api.use('/users', usersRouter); // admin
  api.use('/roles', rolesRouter); // admin
  api.use('/courses', coursesRouter); // catalogue (student) + manage (admin)
  api.use('/teach', teachRouter); // instructor workspace
  api.use('/learning', learningRouter); // student: enroll, pay, quiz
  api.use('/certificates', certificatesRouter);
  api.use('/', adminRouter); // /payments, /audit, /stats
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
