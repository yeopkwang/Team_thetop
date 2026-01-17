import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } });
    if (!reservation) throw new HttpError(404, "예약 없음");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "권한 없음");
    if (![ReservationStatus.REQUESTED, ReservationStatus.PAYMENT_PENDING].includes(reservation.status)) {
      throw new HttpError(400, "표시할 수 없는 상태");
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.PAYMENT_PENDING, paymentMarkedAt: new Date() },
    });

    await logAudit({
      action: "RESERVATION_MARK_PAID",
      entityType: "Reservation",
      entityId: reservation.id,
      actorUserId: session.user.id,
      before: { status: reservation.status },
      after: { status: updated.status },
    });

    return NextResponse.json({ reservation: updated });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
