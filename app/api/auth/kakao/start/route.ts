import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/app-url";
import { KAKAO_STATE_COOKIE, kakaoCookie } from "@/lib/kakao-cookies";

// 카카오 로그인 화면으로 보낸다. 돌아올 때 확인할 state를 쿠키에 적어 둔다.
export async function GET(req: Request) {
  const base = getBaseUrl(req);
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${base}/login?error=kakao_config`);

  const state = randomUUID();
  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${base}/api/auth/kakao/callback`);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(KAKAO_STATE_COOKIE, state, kakaoCookie(base, 10 * 60));
  return res;
}
