export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { salesSummary } from "@/lib/admin-reports";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 관리자 첫 화면의 판매 현황(판매 중인 공연이 없으면 summary: null).
export const GET = route(async () => {
  await requireRoleAtLeast(RoleType.STAFF);
  return NextResponse.json({ summary: await salesSummary() });
});
