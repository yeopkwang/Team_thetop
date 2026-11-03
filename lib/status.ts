// 예매·환불 상태를 화면 문구와 색으로 바꾼다. 브라우저에서도 쓰므로 Prisma를 import하지 않는다.
export type StatusTone = "wait" | "ok" | "brand" | "muted";

const RESERVATION: Record<string, { label: string; tone: StatusTone }> = {
  REQUESTED: { label: "입금 대기", tone: "wait" },
  PAYMENT_PENDING: { label: "입금 대기", tone: "wait" },
  CONFIRMED: { label: "예매 완료", tone: "brand" },
  REFUND_REQUESTED: { label: "환불 대기", tone: "muted" },
  REFUND_PENDING: { label: "환불 대기", tone: "muted" },
  REFUNDED: { label: "환불 완료", tone: "muted" },
  CANCELLED: { label: "예매 취소", tone: "muted" },
  EXPIRED: { label: "기간 만료", tone: "muted" },
};

const REFUND: Record<string, { label: string; tone: StatusTone }> = {
  REQUESTED: { label: "환불 대기", tone: "wait" },
  PENDING: { label: "환불 대기", tone: "wait" },
  REFUNDED: { label: "환불 완료", tone: "muted" },
};

export function reservationStatus(status: string) {
  return RESERVATION[status] || { label: status, tone: "muted" as StatusTone };
}

export function refundStatus(status: string) {
  return REFUND[status] || { label: status, tone: "muted" as StatusTone };
}

export type ShowStatusKey = "DRAFT" | "ON_SALE" | "ENDED";

export const SHOW_STATUS: Record<ShowStatusKey, { label: string; description: string; tone: StatusTone }> = {
  DRAFT: { label: "준비 중", description: "어디에도 보이지 않아요.", tone: "muted" },
  ON_SALE: { label: "판매 중", description: "첫 화면·공연 안내에 나오고 예매를 받아요.", tone: "brand" },
  ENDED: { label: "지난 공연", description: "지난 공연 목록에 나와요. 예매는 받지 않아요.", tone: "wait" },
};
