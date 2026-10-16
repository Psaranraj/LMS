import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { AccessTokenPayload, CertificateDto, CertificateTemplateDto } from '@lms/shared-types';
import { audit } from '../../lib/audit.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

type CertRow = {
  id: number;
  status: CertificateDto['status'];
  code: string;
  reason: string | null;
  decidedAt: Date | null;
  enrollment: { user: { name: string }; course: { title: string } };
};

export const certificateDto = (c: CertRow): CertificateDto => ({
  id: c.id,
  status: c.status,
  code: c.code,
  reason: c.reason,
  courseTitle: c.enrollment.course.title,
  studentName: c.enrollment.user.name,
  issuedAt: c.status === 'ISSUED' ? (c.decidedAt?.toISOString() ?? null) : null,
});

const include = { enrollment: { include: { user: true, course: true } } } as const;

/**
 * Called after every quiz pass and every payment.
 * When all weekly quizzes are passed AND all installments are paid,
 * a certificate request is created for the instructor automatically.
 */
export async function requestIfComplete(enrollmentId: number) {
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { include: { weeks: { select: { id: true } } } }, installments: true, certificate: true, user: true },
  });
  if (!e || e.certificate) return;
  const weekIds = e.course.weeks.map((w) => w.id);
  if (weekIds.length === 0 || e.installments.some((i) => !i.paidAt)) return;
  const passed = await prisma.quizAttempt.findMany({
    where: { userId: e.userId, passed: true, weekId: { in: weekIds } },
    select: { weekId: true },
    distinct: ['weekId'],
  });
  if (passed.length < weekIds.length) return;

  const created = await prisma.certificate.create({ data: { enrollmentId, code: randomUUID() } });
  // Readable unique id such as LMS-2026-000007
  await prisma.certificate.update({
    where: { id: created.id },
    data: { code: `LMS-${new Date().getFullYear()}-${String(created.id).padStart(6, '0')}` },
  });
  await audit('System', `Certificate request sent to instructor for ${e.user.name}`);
}

export async function pendingFor(user: AccessTokenPayload): Promise<CertificateDto[]> {
  const all = user.permissions.includes('courses.manage');
  const rows = await prisma.certificate.findMany({
    where: { status: 'REQUESTED', ...(all ? {} : { enrollment: { course: { instructorId: user.sub } } }) },
    include,
    orderBy: { id: 'asc' },
  });
  return rows.map(certificateDto);
}

async function loadForDecision(user: AccessTokenPayload, id: number) {
  const c = await prisma.certificate.findUnique({ where: { id }, include: { enrollment: { include: { user: true, course: true } } } });
  if (!c) throw new NotFoundError('Certificate not found');
  const canSeeAll = user.permissions.includes('courses.manage');
  if (!canSeeAll && c.enrollment.course.instructorId !== user.sub) throw new ForbiddenError('This is not your course');
  return c;
}

export async function approve(user: AccessTokenPayload, actor: string, id: number) {
  const c = await loadForDecision(user, id);
  if (c.status !== 'REQUESTED') throw new ConflictError('This request was already decided');
  await prisma.certificate.update({ where: { id }, data: { status: 'ISSUED', reason: null, decidedAt: new Date() } });
  await audit(actor, `Approved certificate for ${c.enrollment.user.name}`);
}

export async function reject(user: AccessTokenPayload, actor: string, id: number, reason: string) {
  const c = await loadForDecision(user, id);
  if (c.status !== 'REQUESTED') throw new ConflictError('This request was already decided');
  await prisma.certificate.update({ where: { id }, data: { status: 'REJECTED', reason, decidedAt: new Date() } });
  await audit(actor, `Did not approve certificate for ${c.enrollment.user.name}: ${reason}`);
}

/** Student asks again after a rejection. */
export async function requestAgain(userId: number, id: number) {
  const c = await prisma.certificate.findUnique({ where: { id }, include });
  if (!c || c.enrollment.userId !== userId) throw new NotFoundError('Certificate not found');
  if (c.status !== 'REJECTED') throw new ConflictError('Nothing to request again');
  await prisma.certificate.update({ where: { id }, data: { status: 'REQUESTED' } });
}

export async function revoke(actor: string, id: number) {
  const c = await prisma.certificate.findUnique({ where: { id }, include });
  if (!c) throw new NotFoundError('Certificate not found');
  await prisma.certificate.update({ where: { id }, data: { status: 'REVOKED', decidedAt: new Date() } });
  await audit(actor, `Revoked certificate ${c.code}`);
}

export async function listIssued(): Promise<CertificateDto[]> {
  const rows = await prisma.certificate.findMany({ where: { status: { in: ['ISSUED', 'REVOKED'] } }, include, orderBy: { id: 'desc' } });
  return rows.map(certificateDto);
}

export async function getTemplate(): Promise<CertificateTemplateDto> {
  const t = await prisma.certificateTemplate.findUnique({ where: { id: 1 } });
  return { institute: t?.institute ?? 'Your Academy Name', signatory: t?.signatory ?? 'Director' };
}

export async function saveTemplate(actor: string, data: CertificateTemplateDto) {
  await prisma.certificateTemplate.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  await audit(actor, 'Updated certificate template');
}

/** Streams the certificate as a PDF. Allowed for the owner, or anyone who manages certificates. */
export async function sendPdf(user: AccessTokenPayload, id: number, res: Response) {
  const c = await prisma.certificate.findUnique({ where: { id }, include });
  if (!c) throw new NotFoundError('Certificate not found');
  const staff = user.permissions.includes('certificates.manage_template') || user.permissions.includes('certificates.approve');
  if (c.enrollment.userId !== user.sub && !staff) throw new ForbiddenError();
  if (c.status !== 'ISSUED') throw new ConflictError('This certificate is not issued');

  const t = await getTemplate();
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${c.code}.pdf"`);
  doc.pipe(res);

  const w = doc.page.width;
  const date = (c.decidedAt ?? new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.rect(28, 28, w - 56, doc.page.height - 56).lineWidth(4).stroke('#4F46E5');
  doc.fillColor('#5B5F86').fontSize(14).text(t.institute.toUpperCase(), 0, 90, { align: 'center', characterSpacing: 2 });
  doc.fillColor('#1E1B4B').fontSize(36).text('Certificate of Completion', 0, 130, { align: 'center' });
  doc.fillColor('#5B5F86').fontSize(14).text('This certifies that', 0, 200, { align: 'center' });
  doc.fillColor('#1E1B4B').fontSize(32).text(c.enrollment.user.name, 0, 230, { align: 'center' });
  doc.fillColor('#5B5F86').fontSize(14).text('has successfully completed', 0, 285, { align: 'center' });
  doc.fillColor('#1E1B4B').fontSize(24).text(c.enrollment.course.title, 0, 315, { align: 'center' });
  doc.fontSize(12).fillColor('#1E1B4B');
  doc.text(date, 90, 440, { width: 200, align: 'center' });
  doc.text(t.signatory, w / 2 - 100, 440, { width: 200, align: 'center' });
  doc.text(c.code, w - 290, 440, { width: 200, align: 'center' });
  doc.fillColor('#5B5F86').fontSize(10);
  doc.text('Date', 90, 460, { width: 200, align: 'center' });
  doc.text('Signed', w / 2 - 100, 460, { width: 200, align: 'center' });
  doc.text('Certificate ID', w - 290, 460, { width: 200, align: 'center' });
  doc.end();
}
