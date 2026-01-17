import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { RefundStatus, ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { reservationId } = body;
    if (!reservationId) throw new HttpError(400, "예약 ID 필요");

    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { refund: true } });
    if (!reservation) throw new HttpError(404, "예약 없음");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "권한 없음");
    if (![ReservationStatus.CONFIRMED, ReservationStatus.PAYMENT_PENDING].includes(reservation.status)) {
      throw new HttpError(400, "환불 요청 불가 상태");
    }

    const refund = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.REFUND_REQUESTED },
      });
      const created = await tx.refund.upsert({
        where: { reservationId: reservation.id },
        update: { status: RefundStatus.REQUESTED },
        create: { reservationId: reservation.id, status: RefundStatus.REQUESTED },
      });
      await logAudit({
        action: "REFUND_REQUESTED",
        entityType: "Reservation",
        entityId: reservation.id,
        actorUserId: session.user.id,
        before: { status: reservation.status },
        after: { status: updated.status },
      });
      return created;
    });

    return NextResponse.json({ refund });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
