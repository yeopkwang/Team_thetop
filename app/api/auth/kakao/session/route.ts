import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/app-url";
import { HttpError, route } from "@/lib/http";
import { verifyToken } from "@/lib/jwt";
import { KAKAO_HANDOFF_COOKIE, kakaoCookie } from "@/lib/kakao-cookies";

// 카카오 로그인에서 돌아온 로그인 화면이 토큰을 한 번 받아 간다. 받아 가면 쿠키를 지운다.
export const POST = route(async (req) => {
  const token = cookies().get(KAKAO_HANDOFF_COOKIE)?.value;
  if (!token || !verifyToken(token)) throw new HttpError(401, "카카오 로그인을 다시 해 주세요.");
  const res = NextResponse.json({ token });
  res.cookies.set(KAKAO_HANDOFF_COOKIE, "", kakaoCookie(getBaseUrl(req), 0));
  return res;
});
