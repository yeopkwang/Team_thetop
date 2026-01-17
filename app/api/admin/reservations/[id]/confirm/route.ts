import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { ReservationStatus, RoleType, TicketStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { logAudit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireRoleAtLeast(RoleType.STAFF);
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: { ticket: true },
    });
    if (!reservation) throw new HttpError(404, "예약 없음");
    if (reservation.status !== ReservationStatus.PAYMENT_PENDING && reservation.status !== ReservationStatus.REQUESTED) {
      throw new HttpError(400, "확정할 수 없는 상태");
    }
    if (reservation.expiresAt < new Date() && reservation.status === ReservationStatus.REQUESTED) {
      throw new HttpError(400, "만료된 예약");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CONFIRMED },
      });

      const ticket = reservation.ticket
        ? reservation.ticket
        : await tx.ticket.create({
            data: {
              reservationId: reservation.id,
              qrToken: randomUUID(),
              status: TicketStatus.ACTIVE,
            },
          });

      await logAudit({
        action: "RESERVATION_CONFIRMED",
        entityType: "Reservation",
        entityId: reservation.id,
        actorUserId: session.user.id,
        before: { status: reservation.status },
        after: { status: updated.status, ticketId: ticket.id },
      });

      return { updated, ticket };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
