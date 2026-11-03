import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/app-url";

// 카카오 계정에서도 로그아웃시키고 로그인 화면으로 돌아온다.
export async function GET(req: Request) {
  const base = getBaseUrl(req);
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${base}/login`);

  const logoutUrl = new URL("https://kauth.kakao.com/oauth/logout");
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("logout_redirect_uri", process.env.KAKAO_LOGOUT_REDIRECT_URI || `${base}/login`);
  return NextResponse.redirect(logoutUrl.toString());
}
