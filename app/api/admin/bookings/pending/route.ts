export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ReservationStatus, RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.STAFF);

    const bookings = await prisma.reservation.findMany({
      where: { status: ReservationStatus.PAYMENT_PENDING },
      include: {
        user: { select: { email: true, name: true } },
        session: { select: { id: true, show: { select: { title: true, venue: true } } } },
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
          preferredPerformerName: booking.preferredPerformerName,
          user: booking.user,
          event: {
            id: booking.session.id,
            title: booking.session.show.title,
            venue: booking.session.show.venue,
          },
        },
      }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
