// 예매·환불·공연 상태를 묶음과 화면 문구로 정리한다. 브라우저에서도 쓰므로 Prisma는 타입만 가져온다.
import type { RefundStatus, ReservationStatus, ShowStatus } from "@prisma/client";

export type StatusTone = "wait" | "ok" | "brand" | "muted";

// 좌석을 차지하는 예매. 환불을 요청하면(REFUND_PENDING) 좌석이 풀린다.
export const SEAT_HOLDING_STATUSES: ReservationStatus[] = ["PAYMENT_PENDING", "CONFIRMED"];

// 끝난 예매. 1인 1매 검사에서 '이미 예매함'으로 치지 않아서, 이 상태면 다시 예매할 수 있다.
export const CLOSED_STATUSES: ReservationStatus[] = ["CANCELLED", "EXPIRED", "REFUNDED"];

export function isClosedStatus(status: string) {
  return (CLOSED_STATUSES as string[]).includes(status);
}

const RESERVATION: Record<ReservationStatus, { label: string; tone: StatusTone }> = {
  PAYMENT_PENDING: { label: "입금 대기", tone: "wait" },
  CONFIRMED: { label: "예매 완료", tone: "brand" },
  REFUND_PENDING: { label: "환불 대기", tone: "muted" },
  REFUNDED: { label: "환불 완료", tone: "muted" },
  CANCELLED: { label: "예매 취소", tone: "muted" },
  EXPIRED: { label: "기간 만료", tone: "muted" },
};

const REFUND: Record<RefundStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: "환불 대기", tone: "wait" },
  REFUNDED: { label: "환불 완료", tone: "muted" },
};

export function reservationStatus(status: string) {
  return RESERVATION[status as ReservationStatus] || { label: status, tone: "muted" as StatusTone };
}

export function refundStatus(status: string) {
  return REFUND[status as RefundStatus] || { label: status, tone: "muted" as StatusTone };
}

export type ShowStatusKey = ShowStatus;

export const SHOW_STATUS: Record<ShowStatus, { label: string; description: string; tone: StatusTone }> = {
  DRAFT: { label: "준비 중", description: "어디에도 보이지 않아요.", tone: "muted" },
  ON_SALE: { label: "판매 중", description: "첫 화면·공연 안내에 나오고 예매를 받아요.", tone: "brand" },
  ENDED: { label: "지난 공연", description: "지난 공연 목록에 나와요. 예매는 받지 않아요.", tone: "wait" },
};
