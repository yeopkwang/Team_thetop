// 관객 쪽 예매 처리: 예매, 직접 취소, 환불 요청, 마이 티켓.
import { RefundStatus, ReservationStatus, ShowStatus, TicketStatus } from "@prisma/client";
import { logAudit } from "./audit";
import { formatSessionDate } from "./format";
import { HttpError } from "./http";
import { prisma } from "./prisma";
import { CLOSED_STATUSES, QUEUED_TX, expireOverdue, lockReservation, lockSession, paymentDeadline, seatsHeld } from "./reservations";
import { getCurrentShow } from "./show";
import { isClosedStatus } from "./status";

export type BookingInput = { sessionId: string; preferredPerformerName: string; depositorName: string };

// 1인 1매, 입금 대기로 만든다.
export async function createBooking(userId: string, input: BookingInput) {
  const { sessionId } = input;
  return prisma.$transaction(async (tx) => {
    // 같은 회차 예매를 한 줄로 세운다. 잠그지 않으면 동시에 들어온 요청이
    // 둘 다 잔여석·1인 1매 검사를 통과해서 정원을 넘기거나 한 사람이 두 장을 갖게 된다.
    if (!(await lockSession(tx, sessionId))) throw new HttpError(404, "회차를 찾을 수 없어요.");

    const session = await tx.showSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: { show: { select: { status: true, salesOpenAt: true, paymentHours: true } } },
    });
    const now = new Date();
    if (session.show.status !== ShowStatus.ON_SALE) throw new HttpError(400, "지금 예매 중인 공연이 아니에요.");
    if (session.show.salesOpenAt && session.show.salesOpenAt > now) {
      throw new HttpError(400, `아직 티켓 오픈 전이에요. ${formatSessionDate(session.show.salesOpenAt)}에 열려요.`);
    }
    if (session.date <= now) throw new HttpError(400, "이미 시작한 회차는 예매할 수 없어요.");

    // 입금 기한이 지난 예매는 좌석을 세기 전에 만료시킨다. 잠근 뒤에 해야 센 숫자와 어긋나지 않는다.
    await expireOverdue({ sessionId }, tx);

    const already = await tx.reservation.findFirst({
      where: { userId, sessionId, status: { notIn: CLOSED_STATUSES } },
      select: { id: true },
    });
    if (already) throw new HttpError(400, "이미 예매한 회차예요. 1인 1매만 예매할 수 있어요.");
    if ((await seatsHeld(tx, [sessionId])) + 1 > session.totalCapacity) throw new HttpError(400, "남은 좌석이 없어요.");

    return tx.reservation.create({
      data: {
        userId,
        sessionId,
        qty: 1,
        preferredPerformerName: input.preferredPerformerName,
        depositorName: input.depositorName,
        status: ReservationStatus.PAYMENT_PENDING,
        expiresAt: paymentDeadline(session.show.paymentHours, session.date, now),
      },
    });
  }, QUEUED_TX);
}

// 관객이 입금하기 전에 직접 취소한다. 상태 조건을 걸고 바꿔서, 그사이 입금 확인된 예매는 취소되지 않는다.
export async function cancelOwnBooking(userId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, select: { userId: true } });
  if (!reservation) throw new HttpError(404, "예매를 찾을 수 없어요.");
  if (reservation.userId !== userId) throw new HttpError(403, "내 예매만 취소할 수 있어요.");

  await prisma.$transaction(async (tx) => {
    const cancelled = await tx.reservation.updateMany({
      where: { id: reservationId, status: ReservationStatus.PAYMENT_PENDING },
      data: { status: ReservationStatus.CANCELLED },
    });
    if (cancelled.count === 0) throw new HttpError(400, "입금 대기 중인 예매만 취소할 수 있어요.");
    await logAudit({ action: "BOOKING_CANCELLED", entityType: "Reservation", entityId: reservationId, actorUserId: userId }, tx);
  });
}

// 예매 완료된 티켓의 환불을 요청한다. 요청하면 좌석이 풀리고 그 티켓으로는 입장할 수 없다.
export async function requestRefund(userId: string, reservationId: string) {
  return prisma.$transaction(async (tx) => {
    // 입장 확인과 동시에 들어와도 둘 중 하나만 통과하게 예매 행을 잠근다.
    if (!(await lockReservation(tx, reservationId))) throw new HttpError(404, "예매를 찾을 수 없어요.");
    const reservation = await tx.reservation.findUniqueOrThrow({
      where: { id: reservationId },
      include: { ticket: { include: { checkIn: true } }, session: { select: { date: true } } },
    });
    if (reservation.userId !== userId) throw new HttpError(403, "내 예매만 환불을 요청할 수 있어요.");
    if (reservation.ticket?.checkIn) throw new HttpError(400, "입장한 티켓은 환불을 요청할 수 없어요.");
    if (reservation.status !== ReservationStatus.CONFIRMED) throw new HttpError(400, "예매 완료 상태에서만 환불을 요청할 수 있어요.");
    if (reservation.session.date <= new Date()) {
      throw new HttpError(400, "공연이 시작한 뒤에는 여기서 환불을 요청할 수 없어요. 공연 문의처로 연락해 주세요.");
    }

    await tx.reservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.REFUND_PENDING } });
    const refund = await tx.refund.upsert({
      where: { reservationId },
      update: { status: RefundStatus.PENDING },
      create: { reservationId, status: RefundStatus.PENDING },
    });
    await logAudit(
      {
        action: "REFUND_REQUESTED",
        entityType: "Reservation",
        entityId: reservationId,
        actorUserId: userId,
        before: { status: reservation.status },
        after: { status: ReservationStatus.REFUND_PENDING },
      },
      tx
    );
    return refund;
  });
}

// 마이 티켓: 지금 판매 중인 공연의 내 예매와 티켓, 입금 안내에 필요한 공연 정보.
// 살아 있는 예매(입금 대기·예매 완료·환불 대기)가 있으면 그것을, 없으면 가장 최근에 끝난 예매를 보여 준다.
// (만료된 예매를 운영진이 되살렸는데 그 뒤에 취소한 예매가 있으면, 최근 것만 보면 QR이 가려진다.)
export async function myDashboard(userId: string) {
  const show = await getCurrentShow();
  if (!show) return { booking: null, ticket: null, show: null };

  await expireOverdue({ userId });
  const bookings = await prisma.reservation.findMany({
    where: { userId, session: { showId: show.id } },
    orderBy: { createdAt: "desc" },
    include: { ticket: { include: { checkIn: true } } },
  });
  const booking = bookings.find((b) => !isClosedStatus(b.status)) ?? bookings[0] ?? null;
  const ticket = booking?.ticket?.status === TicketStatus.ACTIVE ? booking.ticket : null;

  return {
    show: {
      title: show.title,
      dateLabel: show.dateLabel,
      timeLabel: show.timeLabel,
      venue: show.venue,
      price: show.price,
      paymentBank: show.paymentBank,
      paymentAccount: show.paymentAccount,
      paymentHolder: show.paymentHolder,
      refundContact: show.refundContact,
    },
    booking: booking && {
      id: booking.id,
      status: booking.status,
      createdAt: booking.createdAt,
      expiresAt: booking.expiresAt,
      depositorName: booking.depositorName,
      cancelReason: booking.cancelReason,
    },
    ticket: ticket && { code: ticket.qrToken, checkedInAt: ticket.checkIn?.createdAt ?? null },
  };
}
