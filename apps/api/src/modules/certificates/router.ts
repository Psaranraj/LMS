import { Router } from 'express';
import { certificateTemplateSchema, rejectCertificateSchema } from '@lms/shared-validation';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { validateBody } from '../../middleware/validate.js';
import { idParam, me } from '../../lib/params.js';
import { prisma } from '../../lib/prisma.js';
import * as service from './service.js';

export const certificatesRouter = Router();
certificatesRouter.use(authenticate);

const actorName = async (id: number) => (await prisma.user.findUniqueOrThrow({ where: { id } })).name;

// ---- Admin: template (declared before the /:id routes so "template" is not read as an id)
certificatesRouter.get('/template', requirePermission('certificates.manage_template'), async (_req, res) => {
  res.json(await service.getTemplate());
});
certificatesRouter.put('/template', requirePermission('certificates.manage_template'), validateBody(certificateTemplateSchema), async (req, res) => {
  await service.saveTemplate(await actorName(me(req)), req.body);
  res.json(await service.getTemplate());
});

// ---- Admin: issued list
certificatesRouter.get('/', requirePermission('certificates.manage_template'), async (_req, res) => {
  res.json({ certificates: await service.listIssued() });
});

// ---- Instructor: requests waiting for a decision
certificatesRouter.get('/pending', requirePermission('certificates.approve'), async (req, res) => {
  res.json({ certificates: await service.pendingFor(req.user!) });
});

certificatesRouter.post('/:id/approve', requirePermission('certificates.approve'), async (req, res) => {
  await service.approve(req.user!, await actorName(me(req)), idParam(req));
  res.status(204).end();
});
certificatesRouter.post('/:id/reject', requirePermission('certificates.approve'), validateBody(rejectCertificateSchema), async (req, res) => {
  await service.reject(req.user!, await actorName(me(req)), idParam(req), req.body.reason);
  res.status(204).end();
});

// ---- Admin: revoke
certificatesRouter.post('/:id/revoke', requirePermission('certificates.manage_template'), async (req, res) => {
  await service.revoke(await actorName(me(req)), idParam(req));
  res.status(204).end();
});

// ---- Student
certificatesRouter.post('/:id/request-again', requirePermission('certificates.view_own'), async (req, res) => {
  await service.requestAgain(me(req), idParam(req));
  res.status(204).end();
});
certificatesRouter.get('/:id/pdf', async (req, res) => {
  await service.sendPdf(req.user!, idParam(req), res);
});
