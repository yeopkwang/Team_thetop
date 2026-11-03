export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentShow } from "@/lib/show";
import { SEAT_HOLDING_STATUSES } from "@/lib/reservations";
import { errorResponse } from "@/lib/http";

// 지금 예매 중인 공연의 회차와 잔여석.
export async function GET() {
  try {
    const show = await getCurrentShow();
    if (!show) return NextResponse.json([]);

    const reservedBySession = await prisma.reservation.groupBy({
      by: ["sessionId"],
      where: {
        sessionId: { in: show.sessions.map((s) => s.id) },
        status: { in: SEAT_HOLDING_STATUSES },
      },
      _sum: { qty: true },
    });
    const reservedQtyMap = new Map(reservedBySession.map((r) => [r.sessionId, r._sum.qty || 0]));

    return NextResponse.json(
      show.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        startAt: session.date,
        totalStock: session.totalCapacity,
        remainingStock: Math.max(0, session.totalCapacity - (reservedQtyMap.get(session.id) || 0)),
      }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
