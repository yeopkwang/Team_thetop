import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { resetPassword } from "@/lib/accounts";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { passwordResetInput } from "@/lib/inputs";

// 다른 운영진의 비밀번호를 새로 정해 준다.
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  const { password } = await readBody(req, passwordResetInput);
  await resetPassword(params.id, password, actor.user.id);
  return NextResponse.json({ ok: true });
});
