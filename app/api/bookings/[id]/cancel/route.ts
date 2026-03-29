import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { ReservationStatus, TicketStatus } from "@prisma/client";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const reservationId = params.id;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { ticket: true },
    });
    if (!reservation) throw new HttpError(404, "예약이 없습니다.");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "권한이 없습니다.");
    if (reservation.status !== ReservationStatus.PAYMENT_PENDING) {
      throw new HttpError(400, "예매 대기 상태에서만 취소할 수 있습니다.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sessionRow = await tx.showSession.findUnique({ where: { id: reservation.sessionId } });
      if (!sessionRow) throw new HttpError(404, "회차를 찾을 수 없습니다.");

      await tx.showSession.update({
        where: { id: sessionRow.id },
        data: { soldQty: Math.max(0, sessionRow.soldQty - reservation.qty) },
      });

      const saved = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CANCELLED },
      });

      if (reservation.ticket) {
        await tx.ticket.update({
          where: { id: reservation.ticket.id },
          data: { status: TicketStatus.REVOKED },
        });
      }

      return saved;
    });

    return NextResponse.json({ reservation: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
