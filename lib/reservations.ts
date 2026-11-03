import { ReservationStatus } from "@prisma/client";

// 좌석을 차지하는 예매 상태. 환불을 요청하면(REFUND_PENDING) 좌석이 풀린다.
export const SEAT_HOLDING_STATUSES: ReservationStatus[] = [
  ReservationStatus.REQUESTED,
  ReservationStatus.PAYMENT_PENDING,
  ReservationStatus.CONFIRMED,
];

// 1인 1매 검사에서 '이미 예매함'으로 치지 않는 상태.
export const CLOSED_STATUSES: ReservationStatus[] = [
  ReservationStatus.CANCELLED,
  ReservationStatus.EXPIRED,
  ReservationStatus.REFUNDED,
];
