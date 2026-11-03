export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";
import { getCurrentShow } from "@/lib/show";

export async function GET() {
  try {
    const session = await requireSession();
    const show = await getCurrentShow();
    if (!show) return NextResponse.json({ booking: null, tickets: [], show: null });

    // 지난 공연의 예매가 아니라, 지금 공연에서 가장 최근에 한 예매를 보여준다.
    const latestBooking = await prisma.reservation.findFirst({
      where: { userId: session.user.id, session: { showId: show.id } },
      orderBy: { createdAt: "desc" },
    });

    const showInfo = {
      title: show.title,
      price: show.price,
      paymentBank: show.paymentBank,
      paymentAccount: show.paymentAccount,
      paymentHolder: show.paymentHolder,
      refundContact: show.refundContact,
    };

    if (!latestBooking) {
      return NextResponse.json({ booking: null, tickets: [], show: showInfo });
    }

    const tickets = await prisma.ticket.findMany({
      where: { status: TicketStatus.ACTIVE, reservationId: latestBooking.id },
      include: { checkIn: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      booking: {
        id: latestBooking.id,
        status: latestBooking.status,
        createdAt: latestBooking.createdAt,
        quantity: latestBooking.qty,
      },
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        ticketCode: ticket.qrToken,
        checkedInAt: ticket.checkIn?.createdAt || null,
        booking: { id: latestBooking.id },
      })),
      show: showInfo,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
