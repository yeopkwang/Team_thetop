import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { changeOwnPassword } from "@/lib/accounts";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { passwordChangeInput } from "@/lib/inputs";

// 운영진이 내 비밀번호를 바꾼다.
export const POST = route(async (req) => {
  const session = await requireRoleAtLeast(RoleType.STAFF);
  const { current, next } = await readBody(req, passwordChangeInput);
  await changeOwnPassword(session.user.id, current, next);
  return NextResponse.json({ ok: true });
});
