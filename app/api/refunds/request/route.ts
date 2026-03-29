import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { RefundStatus, ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const reservationId = String(body?.reservationId || "");
    if (!reservationId) throw new HttpError(400, "?덉빟 ID媛 ?꾩슂?⑸땲??");

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { ticket: { include: { checkIn: true } } },
    });

    if (!reservation) throw new HttpError(404, "?덉빟???놁뒿?덈떎.");
    if (reservation.userId !== session.user.id) throw new HttpError(403, "沅뚰븳???놁뒿?덈떎.");
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new HttpError(400, "?덉빟 ?꾨즺 ?곹깭?먯꽌留??섎텋 ?붿껌??媛?ν빀?덈떎.");
    }
    if (reservation.ticket?.checkIn) {
      throw new HttpError(400, "?대? ?ъ슜(?낆옣 ?꾨즺)???곗폆? ?섎텋 ?붿껌?????놁뒿?덈떎.");
    }

    const refund = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.REFUND_PENDING },
      });

      const created = await tx.refund.upsert({
        where: { reservationId: reservation.id },
        update: { status: RefundStatus.PENDING },
        create: { reservationId: reservation.id, status: RefundStatus.PENDING },
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
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
