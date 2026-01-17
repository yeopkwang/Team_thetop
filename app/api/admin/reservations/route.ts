import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast, HttpError } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    const reservations = await prisma.reservation.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      reservations: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        qty: r.qty,
        userName: r.user.name || r.user.nickname || "사용자",
      })),
    });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
