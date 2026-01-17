import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, HttpError } from "@/lib/auth-helpers";
import { getTemplateImage } from "@/lib/tickets";
import { ReservationStatus, TicketStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await requireSession();
    const roles = (session.user.roles as string[]) || [];

    const reservations = await prisma.reservation.findMany({
      where: { userId: session.user.id },
      include: { session: true },
      orderBy: { createdAt: "desc" },
    });

    const ticketsRaw = await prisma.ticket.findMany({
      where: {
        status: TicketStatus.ACTIVE,
        reservation: { userId: session.user.id, status: ReservationStatus.CONFIRMED },
      },
      include: { reservation: { include: { session: { include: { show: true } } } } },
    });

    const tickets = await Promise.all(
      ticketsRaw.map(async (t) => ({
        id: t.id,
        qrToken: t.qrToken,
        templateImage: await getTemplateImage(t.reservation.sessionId, t.reservation.session.showId),
      }))
    );

    return NextResponse.json({
      user: session.user,
      roles,
      reservations: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        qty: r.qty,
        sessionTitle: r.session.title,
      })),
      tickets,
    });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
