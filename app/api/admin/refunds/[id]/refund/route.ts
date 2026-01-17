import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { RefundStatus, ReservationStatus, RoleType, TicketStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRoleAtLeast(RoleType.ADMIN);
    const refund = await prisma.refund.findUnique({
      where: { id: params.id },
      include: { reservation: { include: { ticket: true } }, account: true },
    });
    if (!refund) throw new HttpError(404, "환불 없음");

    const result = await prisma.$transaction(async (tx) => {
      await tx.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.REFUNDED } });
      const updatedReservation = await tx.reservation.update({
        where: { id: refund.reservationId },
        data: { status: ReservationStatus.REFUNDED },
      });
      const sessionRow = await tx.showSession.findUnique({ where: { id: refund.reservation.sessionId } });
      if (sessionRow) {
        const newSold = Math.max(0, sessionRow.soldQty - refund.reservation.qty);
        await tx.showSession.update({ where: { id: sessionRow.id }, data: { soldQty: newSold } });
      }
      if (refund.reservation.ticket) {
        await tx.ticket.update({ where: { id: refund.reservation.ticket.id }, data: { status: TicketStatus.REVOKED } });
      }
      if (refund.account) {
        await tx.refundAccount.delete({ where: { id: refund.account.id } });
      }
      await logAudit({
        action: "REFUND_COMPLETED",
        entityType: "Refund",
        entityId: refund.id,
        actorUserId: session.user.id,
        before: { status: refund.status },
        after: { status: RefundStatus.REFUNDED },
      });
      return { reservation: updatedReservation };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
