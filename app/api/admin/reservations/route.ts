export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  try {
    await requireRoleAtLeast(RoleType.STAFF);

    const { searchParams } = new URL(req.url);
    const rawLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_LIMIT;
    const cursor = searchParams.get("cursor") || undefined;

    const reservations = await prisma.reservation.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        status: true,
        qty: true,
        preferredPerformerName: true,
        createdAt: true,
        session: {
          select: {
            id: true,
            show: { select: { title: true, venue: true, dateLabel: true, timeLabel: true } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
          },
        },
      },
    });

    const hasNext = reservations.length > limit;
    const rows = hasNext ? reservations.slice(0, limit) : reservations;

    return NextResponse.json({
      reservations: rows.map((r) => ({
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
          title: r.session.show.title,
          venue: r.session.show.venue,
          date: r.session.show.dateLabel,
          time: r.session.show.timeLabel,
        },
      })),
      nextCursor: hasNext ? rows[rows.length - 1]?.id || null : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
