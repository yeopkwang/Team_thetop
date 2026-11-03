import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/accounts";
import { readBody, route } from "@/lib/http";
import { loginInput } from "@/lib/inputs";
import { createToken } from "@/lib/jwt";

// 운영진 토큰은 관객(7일)보다 짧게 둔다. 공용 컴퓨터에서 로그아웃을 잊어도 하루 안에 풀린다.
const STAFF_TOKEN_SECONDS = 12 * 60 * 60;

// 운영진 로그인(아이디·비밀번호). 관객은 카카오로만 로그인한다.
export const POST = route(async (req) => {
  const { id, password } = await readBody(req, loginInput);
  const user = await loginWithPassword(id, password);
  return NextResponse.json({ token: createToken(user.id, STAFF_TOKEN_SECONDS), user });
});
