import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatus.REQUESTED,
  ReservationStatus.PAYMENT_PENDING,
  ReservationStatus.CONFIRMED,
] as const;

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const sessionId = String(body?.sessionId || "");
    const qty = Number(body?.qty || 0);
    const preferredPerformerName = String(body?.preferredPerformerName || "").trim();

    if (!sessionId || !qty || qty <= 0) throw new HttpError(400, "잘못된 요청");
    if (!preferredPerformerName) {
      throw new HttpError(400, "관심 있는 공연자 성함을 입력해 주세요. 없다면 '없음'을 입력해 주세요.");
    }
    if (qty !== 1) throw new HttpError(400, "1인 1매만 예매할 수 있습니다.");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const reservation = await prisma.$transaction(async (tx) => {
      const showSession = await tx.showSession.findUnique({ where: { id: sessionId } });
      if (!showSession) throw new HttpError(404, "회차 없음");

      const alreadyBooked = await tx.reservation.findFirst({
        where: {
          userId: session.user.id,
          sessionId,
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.REFUNDED],
          },
        },
      });
      if (alreadyBooked) throw new HttpError(400, "이미 예매한 회차입니다. 1인 1매만 가능합니다.");

      const reserved = await tx.reservation.aggregate({
        where: {
          sessionId,
          status: { in: ACTIVE_RESERVATION_STATUSES as unknown as ReservationStatus[] },
        },
        _sum: { qty: true },
      });
      const expectedSoldQty = reserved._sum.qty || 0;

      if (showSession.soldQty !== expectedSoldQty) {
        await tx.showSession.update({
          where: { id: sessionId },
          data: { soldQty: expectedSoldQty },
        });
      }

      const updated = await tx.showSession.updateMany({
        where: {
          id: sessionId,
          soldQty: {
            lte: showSession.totalCapacity - qty,
          },
        },
        data: {
          soldQty: { increment: qty },
        },
      });
      if (updated.count === 0) throw new HttpError(400, "잔여 수량 부족");

      const created = await tx.reservation.create({
        data: {
          userId: session.user.id,
          sessionId,
          qty,
          preferredPerformerName,
          status: ReservationStatus.REQUESTED,
          expiresAt,
        },
      });
      await logAudit({
        action: "RESERVATION_CREATED",
        entityType: "Reservation",
        entityId: created.id,
        actorUserId: session.user.id,
        after: { status: created.status, qty, sessionId, preferredPerformerName },
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
