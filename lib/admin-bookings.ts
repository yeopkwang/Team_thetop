// 운영진 쪽 예매 처리: 입금 확인, 운영진 취소, 입장 확인, 환불 완료, 그리고 관리자 목록들.
import { randomUUID } from "crypto";
import { Prisma, RefundStatus, ReservationStatus, ShowStatus, TicketStatus } from "@prisma/client";
import { logAudit } from "./audit";
import { HttpError } from "./http";
import { prisma } from "./prisma";
import { CLOSED_STATUSES, QUEUED_TX, expireOverdue, lockReservation, lockSession, seatsHeld } from "./reservations";

// 입금 확인: 예매를 확정하고 QR 티켓을 만든다.
// 입금 기한이 지나 만료된 예매도, 기한 안에 입금했으면 되살릴 수 있다. 다만 그사이 좌석이 다 찼거나
// 같은 관객이 다시 예매했으면 막는다.
export async function confirmBooking(bookingId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.reservation.findUnique({ where: { id: bookingId }, select: { sessionId: true } });
    if (!found) throw new HttpError(404, "예매를 찾을 수 없어요.");

    // 예매 API와 같은 회차 행을 먼저 잠근다. 상태는 잠근 뒤에 읽어야 만료·새 예매와 엇갈리지 않는다.
    // 기한이 지났는데 아직 안 바뀐 예매도 먼저 만료시켜야, 되살릴 때 남은 좌석을 바르게 센다.
    await lockSession(tx, found.sessionId);
    await expireOverdue({ sessionId: found.sessionId }, tx);
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
      if ((await seatsHeld(tx, [booking.session.id])) + booking.qty > booking.session.totalCapacity) {
        throw new HttpError(400, "그사이 좌석이 다 차서 되살릴 수 없어요. 입금액을 돌려드려 주세요.");
      }
    }

    // 상태 조건을 걸고 바꿔서, 그사이 관객이 취소한 예매나 두 번 누른 승인은 걸러낸다.
    const updated = await tx.reservation.updateMany({
      where: { id: bookingId, status: { in: [ReservationStatus.PAYMENT_PENDING, ReservationStatus.EXPIRED] } },
      data: { status: ReservationStatus.CONFIRMED },
    });
    if (updated.count === 0) throw new HttpError(400, "입금 대기 중인 예매만 확인할 수 있어요.");

    const ticket = await tx.ticket.upsert({
      where: { reservationId: bookingId },
      update: { status: TicketStatus.ACTIVE },
      create: { reservationId: bookingId, qrToken: randomUUID() },
    });
    await logAudit(
      { action: "BOOKING_CONFIRMED", entityType: "Reservation", entityId: bookingId, actorUserId, before: { status: booking.status } },
      tx
    );
    return { id: bookingId, status: ReservationStatus.CONFIRMED, ticketCode: ticket.qrToken };
  }, QUEUED_TX);
}

// 운영진 취소: 입금하지 않은 예매를 취소하고 좌석을 푼다. 사유는 관객의 마이 티켓에 보인다.
export async function cancelBookingByStaff(bookingId: string, reason: string, actorUserId: string) {
  await prisma.$transaction(async (tx) => {
    const cancelled = await tx.reservation.updateMany({
      where: { id: bookingId, status: ReservationStatus.PAYMENT_PENDING },
      data: { status: ReservationStatus.CANCELLED, cancelReason: reason },
    });
    if (cancelled.count === 0) {
      const exists = await tx.reservation.findUnique({ where: { id: bookingId }, select: { id: true } });
      throw exists ? new HttpError(400, "입금 대기 중인 예매만 취소할 수 있어요.") : new HttpError(404, "예매를 찾을 수 없어요.");
    }
    await logAudit(
      { action: "BOOKING_CANCELLED_BY_STAFF", entityType: "Reservation", entityId: bookingId, actorUserId, after: { reason } },
      tx
    );
  });
}

// 입장 확인: QR 토큰으로 티켓을 찾아 한 번만 입장 처리한다.
export async function checkIn(qrToken: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.ticket.findUnique({ where: { qrToken }, select: { reservationId: true } });
    if (!found) throw new HttpError(404, "없는 티켓이에요.");

    // 환불 요청과 동시에 들어와도, 같은 QR을 두 기기에서 동시에 찍어도 한 번만 통과하게 예매 행을 잠근다.
    await lockReservation(tx, found.reservationId);
    const ticket = await tx.ticket.findUniqueOrThrow({
      where: { qrToken },
      include: {
        checkIn: true,
        reservation: {
          select: {
            id: true,
            status: true,
            depositorName: true,
            user: { select: { id: true, name: true } },
            session: { select: { show: { select: { title: true, status: true, dateLabel: true } } } },
          },
        },
      },
    });
    const { reservation } = ticket;
    if (ticket.status !== TicketStatus.ACTIVE) throw new HttpError(400, "취소·환불된 티켓이에요.");
    if (reservation.status === ReservationStatus.REFUND_PENDING) throw new HttpError(400, "환불을 요청한 티켓이에요.");
    if (reservation.status !== ReservationStatus.CONFIRMED) throw new HttpError(400, "입금 확인이 안 된 예매예요.");
    if (reservation.session.show.status !== ShowStatus.ON_SALE) {
      throw new HttpError(400, `지금 공연의 티켓이 아니에요(${reservation.session.show.title}).`);
    }
    if (ticket.checkIn) throw new HttpError(409, "이미 입장 처리된 티켓이에요.");

    const created = await tx.checkIn.create({ data: { ticketId: ticket.id } });
    await logAudit({ action: "CHECKIN_CREATED", entityType: "CheckIn", entityId: created.id, actorUserId, after: { ticketId: ticket.id } }, tx);
    return {
      checkedInAt: created.createdAt,
      bookingId: reservation.id,
      name: reservation.depositorName || reservation.user.name || "관객",
      kakaoName: reservation.user.name,
      showTitle: reservation.session.show.title,
    };
  });
}

// 환불 완료: 관객에게 송금한 뒤 누른다. 두 관리자가 동시에 눌러도 한 번만 처리된다.
export async function completeRefund(refundId: string, actorUserId: string) {
  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new HttpError(404, "환불 요청을 찾을 수 없어요.");
    await lockReservation(tx, refund.reservationId);

    const updated = await tx.refund.updateMany({
      where: { id: refundId, status: RefundStatus.PENDING },
      data: { status: RefundStatus.REFUNDED },
    });
    if (updated.count === 0) throw new HttpError(409, "이미 환불 완료된 건이에요.");
    await tx.reservation.update({ where: { id: refund.reservationId }, data: { status: ReservationStatus.REFUNDED } });
    await tx.ticket.updateMany({ where: { reservationId: refund.reservationId }, data: { status: TicketStatus.REVOKED } });
    await logAudit(
      {
        action: "REFUND_COMPLETED",
        entityType: "Refund",
        entityId: refundId,
        actorUserId,
        before: { status: refund.status },
        after: { status: RefundStatus.REFUNDED },
      },
      tx
    );
  });
}

// 환불 요청 되돌리기: 관객이 잘못 눌렀거나 마음을 바꿨을 때 예매 완료로 되돌린다.
// 요청할 때 풀린 좌석을 다시 잡으므로, 그사이 다른 관객이 채웠으면 되돌리지 않는다.
export async function revertRefund(refundId: string, actorUserId: string) {
  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId }, include: { reservation: { select: { sessionId: true } } } });
    if (!refund) throw new HttpError(404, "환불 요청을 찾을 수 없어요.");
    await lockSession(tx, refund.reservation.sessionId);
    await lockReservation(tx, refund.reservationId);

    const reservation = await tx.reservation.findUniqueOrThrow({
      where: { id: refund.reservationId },
      select: { status: true, qty: true, session: { select: { id: true, totalCapacity: true } } },
    });
    const current = await tx.refund.findUniqueOrThrow({ where: { id: refundId }, select: { status: true } });
    if (current.status !== RefundStatus.PENDING || reservation.status !== ReservationStatus.REFUND_PENDING) {
      throw new HttpError(409, "이미 처리된 환불 요청이에요.");
    }
    await expireOverdue({ sessionId: reservation.session.id }, tx);
    if ((await seatsHeld(tx, [reservation.session.id])) + reservation.qty > reservation.session.totalCapacity) {
      throw new HttpError(400, "그사이 좌석이 다 차서 되돌릴 수 없어요. 환불로 처리해 주세요.");
    }
    await tx.reservation.update({ where: { id: refund.reservationId }, data: { status: ReservationStatus.CONFIRMED } });
    await tx.refund.delete({ where: { id: refundId } });
    await logAudit({ action: "REFUND_REVERTED", entityType: "Reservation", entityId: refund.reservationId, actorUserId }, tx);
  });
}

const depositInclude = {
  user: { select: { name: true } },
  session: { select: { date: true, show: { select: { title: true, price: true } } } },
} satisfies Prisma.ReservationInclude;

// 입금 확인 화면: 입금 대기(최근 예매부터), 그다음 판매 중인 공연에서 기한이 지나 만료된 예매(최근 만료부터).
// 만료된 예매는 늦게 확인한 입금을 되살릴 때 쓴다.
export async function listDeposits() {
  await expireOverdue();
  const rows = await prisma.reservation.findMany({
    where: {
      OR: [
        { status: ReservationStatus.PAYMENT_PENDING },
        { status: ReservationStatus.EXPIRED, session: { date: { gt: new Date() }, show: { status: ShowStatus.ON_SALE } } },
      ],
    },
    include: depositInclude,
  });
  const expired = (r: (typeof rows)[number]) => r.status === ReservationStatus.EXPIRED;
  rows.sort((a, b) =>
    expired(a) !== expired(b)
      ? Number(expired(a)) - Number(expired(b))
      : expired(a)
        ? b.expiresAt.getTime() - a.expiresAt.getTime()
        : b.createdAt.getTime() - a.createdAt.getTime()
  );
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    depositorName: r.depositorName,
    kakaoName: r.user.name,
    preferredPerformerName: r.preferredPerformerName,
    amount: r.session.show.price * r.qty,
    showTitle: r.session.show.title,
  }));
}

// 예매자 목록: 최근 예매부터 limit개씩. cursor는 앞 페이지 마지막 예매의 id.
export async function listReservations(limit: number, cursor?: string) {
  if (!cursor) await expireOverdue();
  const rows = await prisma.reservation.findMany({
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      preferredPerformerName: true,
      depositorName: true,
      cancelReason: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { name: true } },
      session: { select: { show: { select: { title: true } } } },
    },
  });
  const page = rows.slice(0, limit);
  return {
    reservations: page.map((r) => ({
      id: r.id,
      status: r.status,
      preferredPerformerName: r.preferredPerformerName,
      depositorName: r.depositorName,
      cancelReason: r.cancelReason,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      kakaoName: r.user.name || "이름 없음",
      showTitle: r.session.show.title,
    })),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
  };
}

// 환불 관리: 최근 요청부터.
export async function listRefunds() {
  const rows = await prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      reservation: {
        select: { id: true, depositorName: true, user: { select: { name: true } }, session: { select: { show: { select: { title: true } } } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    bookingId: r.reservation.id,
    name: r.reservation.depositorName || r.reservation.user.name || "이름 없음",
    showTitle: r.reservation.session.show.title,
  }));
}
