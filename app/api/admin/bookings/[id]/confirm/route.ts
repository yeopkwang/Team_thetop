import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ReservationStatus, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    const bookingId = params.id;

    const result = await prisma.$transaction(async (tx) => {
      // 상태 조건을 걸고 바꿔서, 그사이 사용자가 취소한 예매나 두 번 누른 승인은 걸러낸다.
      const updated = await tx.reservation.updateMany({
        where: {
          id: bookingId,
          status: { in: [ReservationStatus.PAYMENT_PENDING, ReservationStatus.REQUESTED] },
        },
        data: { status: ReservationStatus.CONFIRMED },
      });
      if (updated.count === 0) {
        const exists = await tx.reservation.findUnique({ where: { id: bookingId }, select: { id: true } });
        throw exists
          ? new HttpError(400, "확정할 수 없는 상태입니다.")
          : new HttpError(404, "예약을 찾을 수 없습니다.");
      }

      const ticket = await tx.ticket.upsert({
        where: { reservationId: bookingId },
        update: {},
        create: { reservationId: bookingId, qrToken: randomUUID() },
      });
      const booking = await tx.reservation.findUniqueOrThrow({ where: { id: bookingId } });
      return { booking, ticket };
    });

    return NextResponse.json({
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        createdAt: result.booking.createdAt,
      },
      tickets: [{ id: result.ticket.id, ticketCode: result.ticket.qrToken }],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
