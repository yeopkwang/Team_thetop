import { ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { logAudit } from "./audit";

export async function expireReservations(actorUserId?: string) {
  const now = new Date();
  const targets = await prisma.reservation.findMany({
    where: { status: ReservationStatus.REQUESTED, expiresAt: { lt: now } },
  });

  for (const reservation of targets) {
    await prisma.$transaction(async (tx) => {
      const session = await tx.showSession.findUnique({ where: { id: reservation.sessionId } });
      if (!session) return;
      const newSold = Math.max(0, session.soldQty - reservation.qty);
      await tx.showSession.update({ where: { id: session.id }, data: { soldQty: newSold } });
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.EXPIRED } });
      await logAudit({
        action: "RESERVATION_EXPIRED",
        entityType: "Reservation",
        entityId: reservation.id,
        actorUserId,
        before: { status: reservation.status },
        after: { status: ReservationStatus.EXPIRED },
      });
    });
  }
  return targets.length;
}

export async function expireUserRoles(actorUserId?: string) {
  const now = new Date();
  const roles = await prisma.userRole.findMany({ where: { isActive: true, expiresAt: { lt: now } } });
  for (const ur of roles) {
    await prisma.userRole.update({ where: { id: ur.id }, data: { isActive: false } });
    await logAudit({
      action: "USER_ROLE_EXPIRED",
      entityType: "UserRole",
      entityId: ur.id,
      actorUserId,
      before: { isActive: true },
      after: { isActive: false },
    });
  }
  return roles.length;
}
