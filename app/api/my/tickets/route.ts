export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireSession();
    const tickets = await prisma.ticket.findMany({
      where: {
        status: TicketStatus.ACTIVE,
        reservation: { userId: session.user.id },
      },
      include: { reservation: true, checkIn: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      tickets.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.qrToken,
        checkedInAt: ticket.checkIn?.createdAt || null,
        booking: { id: ticket.reservationId },
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
