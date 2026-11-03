import { NextResponse } from "next/server";
import { Prisma, RoleType, ReservationStatus, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireRoleAtLeast(RoleType.STAFF);
    const body = await req.json();
    const qrToken = String(body?.qrToken || "").trim();
    if (!qrToken) throw new HttpError(400, "QR 토큰이 필요합니다.");

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken },
      include: {
        reservation: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            session: { include: { show: true } },
          },
        },
        checkIn: true,
      },
    });

    if (!ticket) throw new HttpError(404, "없는 티켓입니다.");
    if (ticket.status !== TicketStatus.ACTIVE) throw new HttpError(400, "취소·환불된 티켓입니다.");
    if (ticket.reservation.status !== ReservationStatus.CONFIRMED) throw new HttpError(400, "입금 확인이 안 된 예매입니다.");
    if (ticket.checkIn) throw new HttpError(409, "이미 입장 처리된 티켓입니다.");

    const checkIn = await prisma.checkIn.create({ data: { ticketId: ticket.id } }).catch((e: unknown) => {
      // 같은 QR을 두 기기에서 동시에 찍은 경우. ticketId가 unique라서 둘째는 여기서 막힌다.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new HttpError(409, "이미 입장 처리된 티켓입니다.");
      }
      throw e;
    });
    await logAudit({
      action: "CHECKIN_CREATED",
      entityType: "CheckIn",
      entityId: checkIn.id,
      actorUserId: session.user.id,
      after: { ticketId: ticket.id },
    });

    const show = ticket.reservation.session.show;
    return NextResponse.json({
      checkIn,
      member: ticket.reservation.user,
      performance: {
        title: show.title,
        venue: show.venue,
        date: show.dateLabel,
        time: show.timeLabel,
      },
      ticket: {
        id: ticket.id,
        qrToken: ticket.qrToken,
        reservationId: ticket.reservationId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
