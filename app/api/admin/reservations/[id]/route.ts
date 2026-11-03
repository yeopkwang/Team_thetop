import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast, HttpError } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoleAtLeast(RoleType.STAFF);
    const reservation = await prisma.reservation.findUnique({ where: { id: params.id }, include: { user: true, session: true } });
    if (!reservation) throw new HttpError(404, "예약 없음");
    return NextResponse.json({ reservation });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
