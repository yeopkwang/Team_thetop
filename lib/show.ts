import { prisma } from "./prisma";
import { SEAT_HOLDING_STATUSES } from "./reservations";

// 홈·예매 화면에 나오는 공연: isActive인 공연 중 가장 최근에 만든 것.
export async function getCurrentShow() {
  return prisma.show.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { sessions: { orderBy: { date: "asc" } } },
  });
}

export type CurrentShow = NonNullable<Awaited<ReturnType<typeof getCurrentShow>>>;

// 공연의 회차별 잔여석.
export async function getSessionAvailability(show: CurrentShow) {
  const reserved = await prisma.reservation.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: show.sessions.map((s) => s.id) },
      status: { in: SEAT_HOLDING_STATUSES },
    },
    _sum: { qty: true },
  });
  const reservedBySession = new Map(reserved.map((r) => [r.sessionId, r._sum.qty || 0]));

  return show.sessions.map((session) => ({
    id: session.id,
    title: session.title,
    date: session.date,
    total: session.totalCapacity,
    remaining: Math.max(0, session.totalCapacity - (reservedBySession.get(session.id) || 0)),
  }));
}

export type SessionAvailability = Awaited<ReturnType<typeof getSessionAvailability>>[number];
