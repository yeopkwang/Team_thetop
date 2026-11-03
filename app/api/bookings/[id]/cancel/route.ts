import { NextResponse } from "next/server";
import { ReservationStatus, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });
    if (!reservation) throw new HttpError(404, "예약이 없습니다.");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "권한이 없습니다.");

    await prisma.$transaction(async (tx) => {
      // 상태 조건을 걸고 바꿔서, 그사이 관리자가 승인한 예매는 취소되지 않게 한다.
      const cancelled = await tx.reservation.updateMany({
        where: { id: reservation.id, status: ReservationStatus.PAYMENT_PENDING },
        data: { status: ReservationStatus.CANCELLED },
      });
      if (cancelled.count === 0) throw new HttpError(400, "예매 대기 상태에서만 취소할 수 있습니다.");

      await tx.ticket.updateMany({
        where: { reservationId: reservation.id },
        data: { status: TicketStatus.REVOKED },
      });
    });

    return NextResponse.json({ reservation: { id: reservation.id, status: ReservationStatus.CANCELLED } });
  } catch (error) {
    return errorResponse(error);
  }
}
