export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { listDeposits } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 입금 확인 화면의 목록: 입금 대기 + 판매 중 공연의 만료된 예매.
export const GET = route(async () => {
  await requireRoleAtLeast(RoleType.STAFF);
  return NextResponse.json({ bookings: await listDeposits() });
});
