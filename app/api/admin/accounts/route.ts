export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { createAccount, listAccounts } from "@/lib/accounts";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { accountCreateInput } from "@/lib/inputs";

// 운영진 계정 목록.
export const GET = route(async () => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  return NextResponse.json({ accounts: await listAccounts(actor.user.id) });
});

// 운영진 계정 만들기.
export const POST = route(async (req) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  const input = await readBody(req, accountCreateInput);
  return NextResponse.json({ id: await createAccount(input, actor.user.id) });
});
