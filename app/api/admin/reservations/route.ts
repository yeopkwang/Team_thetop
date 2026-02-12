export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast, HttpError } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

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
        sessionId: true,
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
          id: r.sessionId,
          title: CURRENT_SHOW_INFO.title,
          venue: CURRENT_SHOW_INFO.venue,
          date: CURRENT_SHOW_INFO.dateLabel,
          time: CURRENT_SHOW_INFO.timeLabel,
        },
      })),
      nextCursor: hasNext ? rows[rows.length - 1]?.id || null : null,
    });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
