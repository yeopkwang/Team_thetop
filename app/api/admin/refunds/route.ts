export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { listRefunds } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

export const GET = route(async () => {
  await requireRoleAtLeast(RoleType.ADMIN);
  return NextResponse.json({ refunds: await listRefunds() });
});
