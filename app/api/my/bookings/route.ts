import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

export async function GET() {
  try {
    const session = await requireSession();
    const bookings = await prisma.reservation.findMany({
      where: { userId: session.user.id },
      include: {
        session: { include: { show: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt,
        quantity: booking.qty,
        event: {
          id: booking.session.id,
          title: CURRENT_SHOW_INFO.title,
          venue: CURRENT_SHOW_INFO.venue,
        },
        payment: CURRENT_SHOW_INFO.payment,
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
