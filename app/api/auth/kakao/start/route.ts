import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "KAKAO_CLIENT_ID is missing" }, { status: 500 });
  }

  const redirectUri = `${getBaseUrl(req)}/api/auth/kakao/callback`;
  const authUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
