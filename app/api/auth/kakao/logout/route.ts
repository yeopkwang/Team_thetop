import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/app-url";

export async function GET(req: Request) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${getBaseUrl(req)}/login?error=${encodeURIComponent("KAKAO_CLIENT_ID가 없습니다.")}`);
  }

  const logoutRedirectUri =
    process.env.KAKAO_LOGOUT_REDIRECT_URI || `${getBaseUrl(req)}/login`;

  const logoutUrl = new URL("https://kauth.kakao.com/oauth/logout");
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("logout_redirect_uri", logoutRedirectUri);

  return NextResponse.redirect(logoutUrl.toString());
}
