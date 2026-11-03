import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { SEAT_HOLDING_STATUSES } from "./status";

export { CLOSED_STATUSES, SEAT_HOLDING_STATUSES } from "./status";

// 입금 기한: 예매한 때부터 paymentHours시간. 공연 시작보다 늦어지지는 않고, 0이면 공연 시작 때까지 기다린다.
export function paymentDeadline(paymentHours: number, startsAt: Date, from = new Date()) {
  if (paymentHours <= 0) return startsAt;
  const deadline = new Date(from.getTime() + paymentHours * 60 * 60 * 1000);
  return deadline < startsAt ? deadline : startsAt;
}

// 입금 기한이 지난 예매를 만료로 바꿔 좌석을 푼다. 따로 도는 예약 작업 없이,
// 좌석을 세거나 예매 목록을 보여 주기 직전에 부른다.
export async function expireOverdue(where: Prisma.ReservationWhereInput = {}, db: Prisma.TransactionClient = prisma) {
  const { count } = await db.reservation.updateMany({
    where: { ...where, status: ReservationStatus.PAYMENT_PENDING, expiresAt: { lt: new Date() } },
    data: { status: ReservationStatus.EXPIRED },
  });
  return count;
}

// 같은 회차 행을 잠그는 트랜잭션은 차례를 기다린다. 기본값(차례 2초, 실행 5초)은 티켓 오픈 직후처럼
// 몰릴 때 너무 짧아서 늘려 둔다. 그래도 넘으면 http.ts가 '요청이 몰려 있어요'(503)로 바꾼다.
export const QUEUED_TX = { maxWait: 10_000, timeout: 15_000 };

// 회차 행을 잠근다. 같은 회차의 예매·입금 확인·정원 변경이 한 줄로 서서, 좌석 수를 센 뒤 바꾸는 사이에 끼어들지 못한다.
export async function lockSession(db: Prisma.TransactionClient, sessionId: string) {
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "ShowSession" WHERE id = ${sessionId} FOR UPDATE`;
  return rows.length > 0;
}

// 예매 행을 잠근다. 환불 요청과 입장 확인이 동시에 들어와 둘 다 통과하는 일을 막는다.
export async function lockReservation(db: Prisma.TransactionClient, reservationId: string) {
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Reservation" WHERE id = ${reservationId} FOR UPDATE`;
  return rows.length > 0;
}

export async function seatsHeld(db: Prisma.TransactionClient, sessionIds: string[]) {
  if (sessionIds.length === 0) return 0;
  const held = await db.reservation.aggregate({
    where: { sessionId: { in: sessionIds }, status: { in: SEAT_HOLDING_STATUSES } },
    _sum: { qty: true },
  });
  return held._sum.qty || 0;
}
