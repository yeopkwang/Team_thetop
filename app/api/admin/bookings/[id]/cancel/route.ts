import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { cancelBookingByStaff } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { staffCancelInput } from "@/lib/inputs";

// 운영진이 입금하지 않은 예매를 취소한다. 사유는 관객에게 보인다.
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.STAFF);
  const { reason } = await readBody(req, staffCancelInput);
  await cancelBookingByStaff(params.id, reason, actor.user.id);
  return NextResponse.json({ booking: { id: params.id, status: "CANCELLED" } });
});
