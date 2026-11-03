import { NextResponse } from "next/server";
import { STAFF_TOKEN_SECONDS, loginWithPassword } from "@/lib/accounts";
import { clientIp, readBody, route } from "@/lib/http";
import { loginInput } from "@/lib/inputs";
import { createToken } from "@/lib/jwt";

// 운영진 로그인(아이디·비밀번호). 관객은 카카오로만 로그인한다.
export const POST = route(async (req) => {
  const { id, password } = await readBody(req, loginInput);
  const user = await loginWithPassword(id, password, clientIp(req));
  return NextResponse.json({ token: createToken(user.id, STAFF_TOKEN_SECONDS), user });
});
