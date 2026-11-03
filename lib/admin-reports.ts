// 관리자용 집계와 명단: 첫 화면의 판매 현황, 예매자 명단(엑셀·인쇄).
import { ReservationStatus, ShowStatus } from "@prisma/client";
import { bookingNumber, formatDateTime } from "./format";
import { HttpError } from "./http";
import { prisma } from "./prisma";
import { expireOverdue } from "./reservations";
import { reservationStatus } from "./status";

// 판매 중인 공연의 현황. 판매 중인 공연이 없으면 null.
export async function salesSummary() {
  const show = await prisma.show.findFirst({
    where: { status: ShowStatus.ON_SALE },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, price: true, salesOpenAt: true, sessions: { select: { id: true, date: true, totalCapacity: true } } },
  });
  if (!show) return null;

  const sessionIds = show.sessions.map((s) => s.id);
  await expireOverdue({ sessionId: { in: sessionIds } });
  const [groups, checkedIn] = await Promise.all([
    prisma.reservation.groupBy({ by: ["status"], where: { sessionId: { in: sessionIds } }, _sum: { qty: true } }),
    prisma.checkIn.count({ where: { ticket: { reservation: { sessionId: { in: sessionIds } } } } }),
  ]);
  const count = (status: ReservationStatus) => groups.find((g) => g.status === status)?._sum.qty || 0;
  const capacity = show.sessions.reduce((sum, s) => sum + s.totalCapacity, 0);
  const confirmed = count(ReservationStatus.CONFIRMED);
  const pending = count(ReservationStatus.PAYMENT_PENDING);
  const refundPending = count(ReservationStatus.REFUND_PENDING);

  return {
    show: { id: show.id, title: show.title, startsAt: show.sessions[0]?.date ?? null, salesOpenAt: show.salesOpenAt },
    capacity,
    remaining: Math.max(0, capacity - confirmed - pending),
    confirmed,
    pending,
    refundPending,
    refunded: count(ReservationStatus.REFUNDED),
    checkedIn,
    // 입금을 받고 아직 돌려주지 않은 돈(환불 대기는 아직 통장에 있다).
    received: show.price * (confirmed + refundPending),
  };
}

// 공연 하나의 예매자 명단. showId가 없으면 판매 중인 공연. 이름 가나다순.
export async function attendeeList(showId?: string) {
  const show = await prisma.show.findFirst({
    where: showId ? { id: showId } : { status: ShowStatus.ON_SALE },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, dateLabel: true, sessions: { select: { id: true } } },
  });
  if (!show) throw new HttpError(404, showId ? "공연을 찾을 수 없어요." : "판매 중인 공연이 없어요.");

  await expireOverdue({ sessionId: { in: show.sessions.map((s) => s.id) } });
  const rows = await prisma.reservation.findMany({
    where: { sessionId: { in: show.sessions.map((s) => s.id) } },
    select: {
      id: true,
      status: true,
      depositorName: true,
      preferredPerformerName: true,
      cancelReason: true,
      createdAt: true,
      user: { select: { name: true } },
      ticket: { select: { checkIn: { select: { createdAt: true } } } },
    },
  });
  const people = rows
    .map((r) => ({
      id: r.id,
      number: bookingNumber(r.id),
      status: r.status,
      name: r.depositorName || r.user.name || "이름 없음",
      kakaoName: r.user.name || "",
      performer: r.preferredPerformerName,
      cancelReason: r.cancelReason,
      createdAt: r.createdAt,
      checkedInAt: r.ticket?.checkIn?.createdAt ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.createdAt.getTime() - b.createdAt.getTime());
  return { show: { id: show.id, title: show.title, dateLabel: show.dateLabel }, people };
}

export type Attendee = Awaited<ReturnType<typeof attendeeList>>["people"][number];

// 엑셀로 내려받을 표(머리 줄 포함).
export function attendeeTable(people: Attendee[]) {
  return [
    ["예매번호", "상태", "입금자명", "카카오 이름", "관심 공연자", "예매 일시", "입장 일시", "취소 사유"],
    ...people.map((p) => [
      p.number,
      reservationStatus(p.status).label,
      p.name,
      p.kakaoName,
      p.performer,
      formatDateTime(p.createdAt),
      p.checkedInAt ? formatDateTime(p.checkedInAt) : "",
      p.cancelReason,
    ]),
  ];
}
