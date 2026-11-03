import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// 트랜잭션 안에서 부를 때는 tx를 넘긴다. 전역 prisma로 쓰면 연결을 하나 더 잡아서,
// connection_limit=1 설정에서는 트랜잭션이 끝날 때까지 기다리다 시간 초과가 난다.
export async function logAudit(
  params: {
    action: string;
    entityType: string;
    entityId: string;
    actorUserId?: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
  db: Prisma.TransactionClient = prisma
) {
  const { action, entityType, entityId, actorUserId, before, after } = params;
  await db.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      actorUserId,
      beforeJson: before ?? Prisma.JsonNull,
      afterJson: after ?? Prisma.JsonNull,
    },
  });
}
