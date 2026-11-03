import { prisma } from "./prisma";

export async function logAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  before?: any;
  after?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { action, entityType, entityId, actorUserId, before, after, ipAddress, userAgent } = params;
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      actorUserId,
      beforeJson: before ?? null,
      afterJson: after ?? null,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    },
  });
}
