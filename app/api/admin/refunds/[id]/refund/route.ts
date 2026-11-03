import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { completeRefund } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 관객에게 송금한 뒤 환불 완료로 바꾼다.
export const POST = route<{ params: { id: string } }>(async (_req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  await completeRefund(params.id, actor.user.id);
  return NextResponse.json({ refund: { id: params.id, status: "REFUNDED" } });
});
