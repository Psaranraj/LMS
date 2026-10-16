import { Router } from 'express';
import type { AdminPaymentRow, AdminStats, AuditRow } from '@lms/shared-types';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { prisma } from '../../lib/prisma.js';
import { installmentStatuses } from '../learning/service.js';

export const adminRouter = Router();

const auditRow = (a: { id: number; actorName: string; action: string; createdAt: Date }): AuditRow => ({
  id: a.id,
  actorName: a.actorName,
  action: a.action,
  createdAt: a.createdAt.toISOString(),
});

async function paymentRows(): Promise<AdminPaymentRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    include: { user: true, course: true, installments: { orderBy: { number: 'asc' } } },
    orderBy: { id: 'asc' },
  });
  return enrollments.flatMap((e) => {
    const statuses = installmentStatuses(e.installments);
    return e.installments.map((i, k) => ({
      id: i.id,
      studentName: e.user.name,
      courseTitle: e.course.title,
      number: i.number,
      installmentCount: e.installments.length,
      amount: i.amount,
      dueDate: i.dueDate.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
      status: statuses[k],
    }));
  });
}

// All payments (admin).
adminRouter.get('/payments', authenticate, requirePermission('payments.view_all'), async (_req, res) => {
  const rows = await paymentRows();
  const collected = rows.filter((r) => r.status === 'PAID').reduce((a, r) => a + r.amount, 0);
  const pending = rows.filter((r) => r.status !== 'PAID').reduce((a, r) => a + r.amount, 0);
  res.json({ rows, collected, pending });
});

// Audit log (admin).
adminRouter.get('/audit', authenticate, requirePermission('audit.view'), async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: 100 });
  res.json({ logs: logs.map(auditRow) });
});

// Admin dashboard numbers.
adminRouter.get('/stats', authenticate, requirePermission('users.view'), async (_req, res) => {
  const rows = await paymentRows();
  const paid = rows.filter((r) => r.status === 'PAID');
  const stats: AdminStats = {
    users: await prisma.user.count(),
    courses: await prisma.course.count(),
    collected: paid.reduce((a, r) => a + r.amount, 0),
    pending: rows.filter((r) => r.status !== 'PAID').reduce((a, r) => a + r.amount, 0),
    recentPayments: paid.sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? '')).slice(0, 4),
    recentActivity: (await prisma.auditLog.findMany({ orderBy: { id: 'desc' }, take: 4 })).map(auditRow),
  };
  res.json(stats);
});
