export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast, HttpError } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    const reservations = await prisma.reservation.findMany({
      include: { user: true, session: { include: { show: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      reservations: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        qty: r.qty,
        preferredPerformerName: r.preferredPerformerName,
        createdAt: r.createdAt,
        userId: r.user.id,
        userName: r.user.name || r.user.nickname || "사용자",
        userEmail: r.user.email || null,
        event: {
          id: r.session.id,
          title: CURRENT_SHOW_INFO.title,
          venue: CURRENT_SHOW_INFO.venue,
          date: CURRENT_SHOW_INFO.dateLabel,
          time: CURRENT_SHOW_INFO.timeLabel,
        },
      })),
    });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
