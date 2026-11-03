import { NextResponse } from "next/server";
import { RefundStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const reservationId = String(body?.reservationId || "");
    if (!reservationId) throw new HttpError(400, "예약 ID가 필요합니다.");

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { ticket: { include: { checkIn: true } } },
    });

    if (!reservation) throw new HttpError(404, "예약이 없습니다.");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "권한이 없습니다.");
    if (reservation.ticket?.checkIn) {
      throw new HttpError(400, "이미 사용(입장 완료)한 티켓은 환불 요청할 수 없습니다.");
    }

    const refund = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: { id: reservation.id, status: ReservationStatus.CONFIRMED },
        data: { status: ReservationStatus.REFUND_PENDING },
      });
      if (updated.count === 0) throw new HttpError(400, "예매 완료 상태에서만 환불 요청이 가능합니다.");

      const created = await tx.refund.upsert({
        where: { reservationId: reservation.id },
        update: { status: RefundStatus.PENDING },
        create: { reservationId: reservation.id, status: RefundStatus.PENDING },
      });

      await logAudit(
        {
          action: "REFUND_REQUESTED",
          entityType: "Reservation",
          entityId: reservation.id,
          actorUserId: session.user.id,
          before: { status: reservation.status },
          after: { status: ReservationStatus.REFUND_PENDING },
        },
        tx
      );

      return created;
    });

    return NextResponse.json({ refund });
  } catch (error) {
    return errorResponse(error);
  }
}
