export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Prisma, ReservationStatus, RoleType, ShowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";
import { PENDING_STATUSES, expireOverdue } from "@/lib/reservations";

const include = {
  user: { select: { email: true, name: true } },
  session: { select: { id: true, date: true, show: { select: { title: true, price: true } } } },
} satisfies Prisma.ReservationInclude;

// 입금 확인 화면: 입금을 기다리는 예매와, 판매 중인 공연에서 기한이 지나 만료된 예매(늦게 확인한 입금을 되살릴 때).
export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    await expireOverdue();

    // 한 번에 받아서 입금 대기(최근 예매부터) 다음에 만료(최근 만료부터) 순으로 놓는다.
    const rows = await prisma.reservation.findMany({
      where: {
        OR: [
          { status: { in: PENDING_STATUSES } },
          { status: ReservationStatus.EXPIRED, session: { date: { gt: new Date() }, show: { status: ShowStatus.ON_SALE } } },
        ],
      },
      include,
    });
    const isExpired = (b: (typeof rows)[number]) => b.status === ReservationStatus.EXPIRED;
    rows.sort((a, b) =>
      isExpired(a) !== isExpired(b)
        ? Number(isExpired(a)) - Number(isExpired(b))
        : isExpired(a)
          ? b.expiresAt.getTime() - a.expiresAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json({
      bookings: rows.map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        expiresAt: b.expiresAt,
        depositorName: b.depositorName,
        preferredPerformerName: b.preferredPerformerName,
        amount: b.session.show.price * b.qty,
        user: b.user,
        event: { id: b.session.id, title: b.session.show.title },
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
