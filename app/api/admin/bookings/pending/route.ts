export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { ReservationStatus, RoleType } from "@prisma/client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.STAFF);

    const bookings = await prisma.reservation.findMany({
      where: { status: ReservationStatus.PAYMENT_PENDING },
      include: {
        user: true,
        session: { include: { show: true } },
        ticket: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      bookings.map((booking) => ({
        booking: {
          id: booking.id,
          status: booking.status,
          createdAt: booking.createdAt,
          quantity: booking.qty,
          user: {
            email: booking.user.email,
            name: booking.user.name,
          },
          event: {
            id: booking.session.id,
            title: CURRENT_SHOW_INFO.title,
            venue: CURRENT_SHOW_INFO.venue,
          },
          payment: CURRENT_SHOW_INFO.payment,
        },
        tickets: booking.ticket ? [{ id: booking.ticket.id, ticketCode: booking.ticket.qrToken }] : [],
      }))
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

