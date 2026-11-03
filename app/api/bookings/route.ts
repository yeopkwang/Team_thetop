import { NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { CLOSED_STATUSES, SEAT_HOLDING_STATUSES } from "@/lib/reservations";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const sessionId = String(body?.eventId || "");
    const quantity = Number(body?.quantity || 0);
    const preferredPerformerName = String(body?.preferredPerformerName || "").trim();

    if (!sessionId || !quantity || quantity < 1) {
      throw new HttpError(400, "잘못된 요청입니다.");
    }
    if (!preferredPerformerName) {
      throw new HttpError(400, "관심 있는 공연자 성함을 입력해 주세요. 없다면 '없음'을 입력해 주세요.");
    }
    if (quantity !== 1) {
      throw new HttpError(400, "1인 1매만 예매할 수 있습니다.");
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const booking = await prisma.$transaction(async (tx) => {
      // 같은 회차 예매를 한 줄로 세운다. 잠그지 않으면 동시에 들어온 요청이
      // 둘 다 잔여석·1인 1매 검사를 통과해서 정원을 넘기거나 한 사람이 두 장을 갖게 된다.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "ShowSession" WHERE id = ${sessionId} FOR UPDATE`;
      if (locked.length === 0) throw new HttpError(404, "해당 회차를 찾을 수 없습니다.");

      const showSession = await tx.showSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { show: { select: { isActive: true } } },
      });
      if (!showSession.show.isActive) throw new HttpError(400, "지금 예매 중인 공연이 아닙니다.");

      const alreadyBooked = await tx.reservation.findFirst({
        where: { userId: session.user.id, sessionId, status: { notIn: CLOSED_STATUSES } },
        select: { id: true },
      });
      if (alreadyBooked) {
        throw new HttpError(400, "이미 예매한 회차입니다. 1인 1매만 가능합니다.");
      }

      const reserved = await tx.reservation.aggregate({
        where: { sessionId, status: { in: SEAT_HOLDING_STATUSES } },
        _sum: { qty: true },
      });
      if ((reserved._sum.qty || 0) + quantity > showSession.totalCapacity) {
        throw new HttpError(400, "잔여 수량이 부족합니다.");
      }

      return tx.reservation.create({
        data: {
          userId: session.user.id,
          sessionId,
          qty: quantity,
          preferredPerformerName,
          status: ReservationStatus.PAYMENT_PENDING,
          expiresAt,
        },
      });
    });

    return NextResponse.json({
      booking: { id: booking.id, status: booking.status, createdAt: booking.createdAt },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
