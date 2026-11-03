import { NextResponse } from "next/server";
import { RefundStatus, ReservationStatus, RoleType, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { logAudit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRoleAtLeast(RoleType.ADMIN);

    const result = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: params.id } });
      if (!refund) throw new HttpError(404, "환불 요청을 찾을 수 없습니다.");

      // 상태 조건을 걸고 바꿔서, 두 관리자가 동시에 눌러도 한 번만 처리된다.
      const updated = await tx.refund.updateMany({
        where: { id: refund.id, status: { not: RefundStatus.REFUNDED } },
        data: { status: RefundStatus.REFUNDED },
      });
      if (updated.count === 0) throw new HttpError(409, "이미 환불 완료된 건입니다.");

      const reservation = await tx.reservation.update({
        where: { id: refund.reservationId },
        data: { status: ReservationStatus.REFUNDED },
      });
      await tx.ticket.updateMany({
        where: { reservationId: refund.reservationId },
        data: { status: TicketStatus.REVOKED },
      });
      await logAudit(
        {
          action: "REFUND_COMPLETED",
          entityType: "Refund",
          entityId: refund.id,
          actorUserId: session.user.id,
          before: { status: refund.status },
          after: { status: RefundStatus.REFUNDED },
        },
        tx
      );
      return { reservation };
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
