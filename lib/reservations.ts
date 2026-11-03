import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "./prisma";

// 입금을 기다리는 예매 상태.
export const PENDING_STATUSES: ReservationStatus[] = [ReservationStatus.REQUESTED, ReservationStatus.PAYMENT_PENDING];

// 좌석을 차지하는 예매 상태. 환불을 요청하면(REFUND_PENDING) 좌석이 풀린다.
export const SEAT_HOLDING_STATUSES: ReservationStatus[] = [...PENDING_STATUSES, ReservationStatus.CONFIRMED];

// 1인 1매 검사에서 '이미 예매함'으로 치지 않는 상태.
export const CLOSED_STATUSES: ReservationStatus[] = [
  ReservationStatus.CANCELLED,
  ReservationStatus.EXPIRED,
  ReservationStatus.REFUNDED,
];

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
    where: { ...where, status: { in: PENDING_STATUSES }, expiresAt: { lt: new Date() } },
    data: { status: ReservationStatus.EXPIRED },
  });
  return count;
}
