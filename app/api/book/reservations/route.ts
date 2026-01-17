import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { sessionId, qty } = body;
    if (!sessionId || !qty || qty <= 0) throw new HttpError(400, "잘못된 요청");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const reservation = await prisma.$transaction(async (tx) => {
      const showSession = await tx.showSession.findUnique({ where: { id: sessionId } });
      if (!showSession) throw new HttpError(404, "회차 없음");
      if (showSession.soldQty + qty > showSession.totalCapacity) throw new HttpError(400, "잔여 수량 부족");
      await tx.showSession.update({
        where: { id: sessionId },
        data: { soldQty: showSession.soldQty + qty },
      });
      const created = await tx.reservation.create({
        data: {
          userId: session.user.id,
          sessionId,
          qty,
          status: ReservationStatus.REQUESTED,
          expiresAt,
        },
      });
      await logAudit({
        action: "RESERVATION_CREATED",
        entityType: "Reservation",
        entityId: created.id,
        actorUserId: session.user.id,
        after: { status: created.status, qty, sessionId },
      });
      return created;
    });

    return NextResponse.json({ reservation });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
