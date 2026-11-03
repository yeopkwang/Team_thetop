export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { listReservations } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;

// 예매자 목록(최근 예매부터, cursor로 다음 페이지).
export const GET = route(async (req) => {
  await requireRoleAtLeast(RoleType.STAFF);
  const { searchParams } = new URL(req.url);
  const raw = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Number.isFinite(raw) ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(raw))) : DEFAULT_LIMIT;
  return NextResponse.json(await listReservations(limit, searchParams.get("cursor") || undefined));
});
