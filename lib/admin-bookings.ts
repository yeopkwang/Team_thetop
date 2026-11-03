import { randomUUID } from "crypto";
import { ReservationStatus, ShowStatus, TicketStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./http";
import { logAudit } from "./audit";
import { CLOSED_STATUSES, PENDING_STATUSES, SEAT_HOLDING_STATUSES } from "./reservations";

// 입금 확인: 예매를 확정하고 QR 티켓을 만든다.
// 입금 기한이 지나 만료된 예매도, 기한 안에 입금했으면 되살릴 수 있다. 다만 그사이 좌석이 다 찼거나
// 같은 관객이 다시 예매했으면 막는다.
export async function confirmBooking(bookingId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.reservation.findUnique({ where: { id: bookingId }, select: { sessionId: true } });
    if (!found) throw new HttpError(404, "예약을 찾을 수 없습니다.");

    // 예매 API와 같은 회차 행을 먼저 잠근다. 상태는 잠근 뒤에 읽어야 만료·새 예매와 엇갈리지 않는다.
    await tx.$queryRaw`SELECT id FROM "ShowSession" WHERE id = ${found.sessionId} FOR UPDATE`;
    const booking = await tx.reservation.findUniqueOrThrow({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        userId: true,
        qty: true,
        session: { select: { id: true, date: true, totalCapacity: true, show: { select: { status: true } } } },
      },
    });

    if (booking.status === ReservationStatus.EXPIRED) {
      if (booking.session.show.status !== ShowStatus.ON_SALE || booking.session.date <= new Date()) {
        throw new HttpError(400, "판매가 끝난 공연의 만료된 예매는 되살릴 수 없어요.");
      }
      const other = await tx.reservation.findFirst({
        where: { userId: booking.userId, sessionId: booking.session.id, id: { not: booking.id }, status: { notIn: CLOSED_STATUSES } },
        select: { id: true },
      });
      if (other) throw new HttpError(400, "이 관객은 다시 예매한 기록이 있어요. 새 예매에서 입금을 확인해 주세요.");
      const held = await tx.reservation.aggregate({
        where: { sessionId: booking.session.id, status: { in: SEAT_HOLDING_STATUSES } },
        _sum: { qty: true },
      });
      if ((held._sum.qty || 0) + booking.qty > booking.session.totalCapacity) {
        throw new HttpError(400, "그사이 좌석이 다 차서 되살릴 수 없어요. 입금액을 돌려드려 주세요.");
      }
    }

    // 상태 조건을 걸고 바꿔서, 그사이 사용자가 취소한 예매나 두 번 누른 승인은 걸러낸다.
    const updated = await tx.reservation.updateMany({
      where: { id: bookingId, status: { in: [...PENDING_STATUSES, ReservationStatus.EXPIRED] } },
      data: { status: ReservationStatus.CONFIRMED },
    });
    if (updated.count === 0) throw new HttpError(400, "확정할 수 없는 상태입니다.");

    const ticket = await tx.ticket.upsert({
      where: { reservationId: bookingId },
      update: { status: TicketStatus.ACTIVE },
      create: { reservationId: bookingId, qrToken: randomUUID() },
    });
    await logAudit(
      {
        action: "BOOKING_CONFIRMED",
        entityType: "Reservation",
        entityId: bookingId,
        actorUserId,
        before: { status: booking.status },
      },
      tx
    );
    const confirmed = await tx.reservation.findUniqueOrThrow({ where: { id: bookingId } });
    return { booking: confirmed, ticket };
  });
}

// 운영진 취소: 입금하지 않은 예매를 취소하고 좌석을 푼다. 사유는 관객의 마이 티켓에 보인다.
export async function cancelBookingByStaff(bookingId: string, reason: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const cancelled = await tx.reservation.updateMany({
      where: { id: bookingId, status: { in: PENDING_STATUSES } },
      data: { status: ReservationStatus.CANCELLED, cancelReason: reason },
    });
    if (cancelled.count === 0) {
      const exists = await tx.reservation.findUnique({ where: { id: bookingId }, select: { id: true } });
      throw exists
        ? new HttpError(400, "입금 대기 중인 예매만 취소할 수 있어요.")
        : new HttpError(404, "예약을 찾을 수 없습니다.");
    }
    await logAudit(
      { action: "BOOKING_CANCELLED_BY_STAFF", entityType: "Reservation", entityId: bookingId, actorUserId, after: { reason } },
      tx
    );
  });
}
