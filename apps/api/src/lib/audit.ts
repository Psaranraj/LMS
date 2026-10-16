import { prisma } from './prisma.js';

/** Writes one line to the audit log. Shown on the admin Audit log page. */
export async function audit(actorName: string, action: string) {
  await prisma.auditLog.create({ data: { actorName, action } });
}
