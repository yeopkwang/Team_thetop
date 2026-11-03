export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { listAuditLogs } from "@/lib/audit-log";
import { LOG_KINDS, type LogKind } from "@/lib/log-kinds";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 작업 기록(최근 것부터 50개씩). ?kind=booking|show|account로 거르고, ?cursor=로 다음 페이지.
export const GET = route(async (req) => {
  await requireRoleAtLeast(RoleType.ADMIN);
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  return NextResponse.json(
    await listAuditLogs(kind && kind in LOG_KINDS ? (kind as LogKind) : undefined, searchParams.get("cursor") || undefined)
  );
});
