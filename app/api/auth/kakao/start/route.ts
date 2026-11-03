import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/app-url";

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
