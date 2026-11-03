import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { revertRefund } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 환불 요청을 되돌려 예매 완료로 돌린다(관객이 잘못 눌렀을 때).
export const POST = route<{ params: { id: string } }>(async (_req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  await revertRefund(params.id, actor.user.id);
  return NextResponse.json({ refund: { id: params.id, reverted: true } });
});
