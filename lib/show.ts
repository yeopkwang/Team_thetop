import { ShowStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { SEAT_HOLDING_STATUSES, expireOverdue } from "./reservations";

const withSessions = { sessions: { orderBy: { date: "asc" as const } } };

// 첫 화면·공연 안내·예매에 나오는 공연: 판매 중인 공연(한 번에 하나만 둔다).
export async function getCurrentShow() {
  return prisma.show.findFirst({
    where: { status: ShowStatus.ON_SALE },
    orderBy: { createdAt: "desc" },
    include: withSessions,
  });
}

export type CurrentShow = NonNullable<Awaited<ReturnType<typeof getCurrentShow>>>;

// 지난 공연 목록: 최근 공연부터. 회차 날짜가 없으면 만든 순서로 둔다.
export async function getPastShows() {
  const shows = await prisma.show.findMany({ where: { status: ShowStatus.ENDED }, include: withSessions });
  const when = (s: (typeof shows)[number]) => (s.sessions[0]?.date ?? s.createdAt).getTime();
  return shows.sort((a, b) => when(b) - when(a));
}

export async function getPastShow(id: string) {
  return prisma.show.findFirst({ where: { id, status: ShowStatus.ENDED }, include: withSessions });
}

// 공연의 회차별 잔여석. 입금 기한이 지난 예매는 먼저 만료시켜 좌석을 돌려놓는다.
export async function getSessionAvailability(show: CurrentShow) {
  await expireOverdue({ sessionId: { in: show.sessions.map((s) => s.id) } });
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
