import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { ReservationStatus } from "@prisma/client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const sessionId = String(body?.eventId || "");
    const quantity = Number(body?.quantity || 0);

    if (!sessionId || !quantity || quantity < 1) {
      throw new HttpError(400, "잘못된 요청입니다.");
    }
    if (quantity !== 1) {
      throw new HttpError(400, "1인 1매만 예매할 수 있습니다.");
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const booking = await prisma.$transaction(async (tx) => {
      const showSession = await tx.showSession.findUnique({ where: { id: sessionId } });
      if (!showSession) throw new HttpError(404, "회차를 찾을 수 없습니다.");

      const alreadyBooked = await tx.reservation.findFirst({
        where: {
          userId: session.user.id,
          sessionId,
          status: {
            notIn: [ReservationStatus.CANCELLED, ReservationStatus.EXPIRED, ReservationStatus.REFUNDED],
          },
        },
      });
      if (alreadyBooked) {
        throw new HttpError(400, "이미 예매한 회차입니다. 1인 1매만 가능합니다.");
      }

      if (showSession.soldQty + quantity > showSession.totalCapacity) {
        throw new HttpError(400, "잔여 수량이 부족합니다.");
      }

      await tx.showSession.update({
        where: { id: sessionId },
        data: { soldQty: showSession.soldQty + quantity },
      });

      return tx.reservation.create({
        data: {
          userId: session.user.id,
          sessionId,
          qty: quantity,
          status: ReservationStatus.PAYMENT_PENDING,
          expiresAt,
        },
        include: {
          session: { include: { show: true } },
        },
      });
    });

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt,
        quantity: booking.qty,
        event: {
          id: booking.session.id,
          title: CURRENT_SHOW_INFO.title,
          venue: CURRENT_SHOW_INFO.venue,
        },
      },
      tickets: [],
      payment: CURRENT_SHOW_INFO.payment,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
