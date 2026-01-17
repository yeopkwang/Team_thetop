import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { RoleType, ReservationStatus, TicketStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireRoleAtLeast(RoleType.STAFF);
    const body = await req.json();
    const { qrToken } = body;
    if (!qrToken) throw new HttpError(400, "qrToken 필요");

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken },
      include: { reservation: true, checkIn: true },
    });
    if (!ticket) throw new HttpError(404, "티켓 없음");
    if (ticket.status !== TicketStatus.ACTIVE) throw new HttpError(400, "비활성 티켓");
    if (ticket.reservation.status !== ReservationStatus.CONFIRMED) throw new HttpError(400, "확정되지 않음");
    if (ticket.checkIn) throw new HttpError(409, "이미 체크인");

    const checkIn = await prisma.checkIn.create({ data: { ticketId: ticket.id } });
    await logAudit({
      action: "CHECKIN_CREATED",
      entityType: "CheckIn",
      entityId: checkIn.id,
      actorUserId: session.user.id,
      after: { ticketId: ticket.id },
    });

    return NextResponse.json({ checkIn });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
