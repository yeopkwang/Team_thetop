export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireSession();

    const latestBooking = await prisma.reservation.findFirst({
      where: { userId: session.user.id },
      include: { session: { include: { show: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!latestBooking) {
      return NextResponse.json({ booking: null, tickets: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        status: TicketStatus.ACTIVE,
        reservationId: latestBooking.id,
      },
      include: { checkIn: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      booking: {
        id: latestBooking.id,
        status: latestBooking.status,
        createdAt: latestBooking.createdAt,
        quantity: latestBooking.qty,
        event: {
          id: latestBooking.session.id,
          title: CURRENT_SHOW_INFO.title,
          venue: CURRENT_SHOW_INFO.venue,
        },
      },
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.qrToken,
        checkedInAt: ticket.checkIn?.createdAt || null,
        booking: { id: latestBooking.id },
      })),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
