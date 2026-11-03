import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { confirmBooking } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 입금 확인(만료된 예매 되살리기 포함).
export const POST = route<{ params: { id: string } }>(async (_req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.STAFF);
  return NextResponse.json({ booking: await confirmBooking(params.id, actor.user.id) });
});
