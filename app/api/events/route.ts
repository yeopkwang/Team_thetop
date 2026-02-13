export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";
import { ReservationStatus } from "@prisma/client";

export async function GET() {
  const sessions = await prisma.showSession.findMany({
    include: { show: true },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  const reservedBySession = await prisma.reservation.groupBy({
    by: ["sessionId"],
    where: {
      status: {
        in: [ReservationStatus.REQUESTED, ReservationStatus.PAYMENT_PENDING, ReservationStatus.CONFIRMED],
      },
    },
    _sum: { qty: true },
  });
  const reservedQtyMap = new Map(reservedBySession.map((r) => [r.sessionId, r._sum.qty || 0]));

  return NextResponse.json(
    sessions.map((session) => ({
      id: session.id,
      title: session.title,
      startAt: session.date,
      totalStock: session.totalCapacity,
      remainingStock: Math.max(0, session.totalCapacity - (reservedQtyMap.get(session.id) || 0)),
      showPost: {
        id: session.show.id,
        title: CURRENT_SHOW_INFO.title,
        content: CURRENT_SHOW_INFO.notice,
      },
    }))
  );
}
