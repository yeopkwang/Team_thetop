export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { checkIn, listCheckInTickets } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { checkInInput } from "@/lib/inputs";

// 입장 확인 명단(판매 중인 공연에서 입금 확인된 관객).
export const GET = route(async () => {
  await requireRoleAtLeast(RoleType.STAFF);
  return NextResponse.json({ tickets: await listCheckInTickets() });
});

// 입장 확인: QR(qrToken) 또는 명단에서 고른 관객(bookingId).
export const POST = route(async (req) => {
  const actor = await requireRoleAtLeast(RoleType.STAFF);
  const by = await readBody(req, checkInInput);
  return NextResponse.json(await checkIn(by, actor.user.id));
});
