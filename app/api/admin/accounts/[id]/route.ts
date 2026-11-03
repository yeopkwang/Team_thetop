import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { deleteAccount } from "@/lib/accounts";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

// 운영진 계정 지우기.
export const DELETE = route<{ params: { id: string } }>(async (_req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  await deleteAccount(params.id, actor.user.id);
  return NextResponse.json({ ok: true });
});
