import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { checkIn } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { checkInInput } from "@/lib/inputs";

// 입장 확인(QR).
export const POST = route(async (req) => {
  const actor = await requireRoleAtLeast(RoleType.STAFF);
  const { qrToken } = await readBody(req, checkInInput);
  return NextResponse.json(await checkIn(qrToken, actor.user.id));
});
