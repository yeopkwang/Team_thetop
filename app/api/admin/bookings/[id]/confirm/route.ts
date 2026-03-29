import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { ReservationStatus, RoleType, TicketStatus } from "@prisma/client";
import { randomUUID } from "crypto";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    const bookingId = params.id;

    const booking = await prisma.reservation.findUnique({
      where: { id: bookingId },
      include: { ticket: true, session: true },
    });
    if (!booking) throw new HttpError(404, "예약을 찾을 수 없습니다.");
    if (
      booking.status !== ReservationStatus.PAYMENT_PENDING &&
      booking.status !== ReservationStatus.REQUESTED
    ) {
      throw new HttpError(400, "확정할 수 없는 상태입니다.");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: bookingId },
        data: { status: ReservationStatus.CONFIRMED },
      });

      const ticket =
        booking.ticket ||
        (await tx.ticket.create({
          data: {
            reservationId: bookingId,
            qrToken: randomUUID(),
            status: TicketStatus.ACTIVE,
          },
        }));

      return { updated, ticket };
    });

    return NextResponse.json({
      booking: {
        id: result.updated.id,
        status: result.updated.status,
        createdAt: result.updated.createdAt,
      },
      tickets: [{ id: result.ticket.id, ticketCode: result.ticket.qrToken }],
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
