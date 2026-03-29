import { NextResponse } from "next/server";
import { requireRoleAtLeast, HttpError } from "@/lib/auth-helpers";
import { expireReservations, expireUserRoles } from "@/lib/jobs";
import { RoleType } from "@prisma/client";

export async function POST() {
  try {
    const session = await requireRoleAtLeast(RoleType.ADMIN);
    const expiredReservations = await expireReservations(session.user.id);
    const expiredRoles = await expireUserRoles(session.user.id);
    return NextResponse.json({ expiredReservations, expiredRoles });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
