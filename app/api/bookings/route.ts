import { NextResponse } from "next/server";
import { ReservationStatus, ShowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { CLOSED_STATUSES, SEAT_HOLDING_STATUSES, expireOverdue, paymentDeadline } from "@/lib/reservations";
import { formatSessionDate } from "@/lib/format";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const sessionId = String(body?.eventId || "");
    const quantity = Number(body?.quantity || 0);
    const preferredPerformerName = String(body?.preferredPerformerName || "").trim();
    const depositorName = String(body?.depositorName || "").replace(/\s+/g, " ").trim();

    if (!sessionId || !quantity || quantity < 1) {
      throw new HttpError(400, "잘못된 요청입니다.");
    }
    if (!preferredPerformerName) {
      throw new HttpError(400, "관심 있는 공연자 성함을 입력해 주세요. 없다면 '없음'을 입력해 주세요.");
    }
    if (!depositorName) {
      throw new HttpError(400, "입금자명을 적어 주세요. 관람객 본인의 실명이어야 해요.");
    }
    if (depositorName.length > 20 || preferredPerformerName.length > 50) {
      throw new HttpError(400, "입금자명은 20자, 공연자 이름은 50자 안으로 적어 주세요.");
    }
    if (quantity !== 1) {
      throw new HttpError(400, "1인 1매만 예매할 수 있습니다.");
    }

    const booking = await prisma.$transaction(async (tx) => {
      // 같은 회차 예매를 한 줄로 세운다. 잠그지 않으면 동시에 들어온 요청이
      // 둘 다 잔여석·1인 1매 검사를 통과해서 정원을 넘기거나 한 사람이 두 장을 갖게 된다.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "ShowSession" WHERE id = ${sessionId} FOR UPDATE`;
      if (locked.length === 0) throw new HttpError(404, "해당 회차를 찾을 수 없습니다.");

      const showSession = await tx.showSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: { show: { select: { status: true, salesOpenAt: true, paymentHours: true } } },
      });
      if (showSession.show.status !== ShowStatus.ON_SALE) throw new HttpError(400, "지금 예매 중인 공연이 아닙니다.");
      if (showSession.show.salesOpenAt && showSession.show.salesOpenAt > new Date()) {
        throw new HttpError(400, `아직 티켓 오픈 전이에요. ${formatSessionDate(showSession.show.salesOpenAt)}에 열려요.`);
      }
      if (showSession.date <= new Date()) throw new HttpError(400, "이미 시작한 회차는 예매할 수 없어요.");

      // 입금 기한이 지난 예매는 좌석을 세기 전에 만료시킨다. 잠근 뒤에 해야 센 숫자와 어긋나지 않는다.
      await expireOverdue({ sessionId }, tx);

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
          depositorName,
          status: ReservationStatus.PAYMENT_PENDING,
          expiresAt: paymentDeadline(showSession.show.paymentHours, showSession.date),
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
