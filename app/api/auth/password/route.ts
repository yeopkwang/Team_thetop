import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { STAFF_TOKEN_SECONDS, changeOwnPassword } from "@/lib/accounts";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";
import { passwordChangeInput } from "@/lib/inputs";
import { createToken } from "@/lib/jwt";

// 운영진이 내 비밀번호를 바꾼다. 전에 받은 로그인은 모두 끊기므로 이 기기에서 쓸 새 토큰을 준다.
export const POST = route(async (req) => {
  const session = await requireRoleAtLeast(RoleType.STAFF);
  const { current, next } = await readBody(req, passwordChangeInput);
  await changeOwnPassword(session.user.id, current, next);
  return NextResponse.json({ token: createToken(session.user.id, STAFF_TOKEN_SECONDS) });
});
