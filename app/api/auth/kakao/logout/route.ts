import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

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
