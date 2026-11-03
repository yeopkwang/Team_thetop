import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { getBaseUrl } from "@/lib/app-url";
import { activeRoles } from "@/lib/auth-helpers";
import { staffLevel } from "@/lib/roles";
import { createToken } from "@/lib/jwt";
import { KAKAO_HANDOFF_COOKIE, KAKAO_STATE_COOKIE, kakaoCookie } from "@/lib/kakao-cookies";
import type { LoginErrorCode } from "@/lib/login-errors";
import { prisma } from "@/lib/prisma";

class LoginFailure extends Error {
  constructor(readonly code: LoginErrorCode) {
    super(code);
  }
}

async function kakaoProfile(code: string, redirectUri: string) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) throw new LoginFailure("kakao_config");

  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, redirect_uri: redirectUri, code });
  if (process.env.KAKAO_CLIENT_SECRET) body.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: body.toString(),
  });
  if (!tokenRes.ok) throw new LoginFailure("kakao_failed");
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new LoginFailure("kakao_failed");

  const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!profileRes.ok) throw new LoginFailure("kakao_failed");
  const profile = (await profileRes.json()) as { id?: number; properties?: { nickname?: string } };
  if (!profile.id) throw new LoginFailure("kakao_failed");
  return { kakaoId: String(profile.id), nickname: profile.properties?.nickname?.trim() || "카카오 사용자" };
}

// 카카오 계정의 관객을 찾거나 만들고, 관객 역할을 붙인다. 운영진 계정은 카카오로 들어올 수 없다.
async function upsertAudience(kakaoId: string, nickname: string) {
  const userRole = await prisma.role.findUnique({ where: { type: RoleType.USER } });
  if (!userRole) throw new Error("USER 역할이 없어요. 시드를 먼저 실행해 주세요.");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { kakaoId },
      update: {},
      create: { kakaoId, name: nickname, nickname },
      select: { id: true, roles: { where: activeRoles(), select: { role: { select: { type: true } } } } },
    });
    const roles = user.roles.map((r) => r.role.type);
    if (staffLevel(roles)) throw new LoginFailure("admin_account");
    if (!roles.includes(RoleType.USER)) await tx.userRole.create({ data: { userId: user.id, roleId: userRole.id } });
    return user;
  });
}

export async function GET(req: Request) {
  const base = getBaseUrl(req);
  const fail = (code: LoginErrorCode) => {
    const res = NextResponse.redirect(`${base}/login?error=${code}`);
    res.cookies.set(KAKAO_STATE_COOKIE, "", kakaoCookie(base, 0));
    return res;
  };
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return fail(url.searchParams.get("error") === "access_denied" ? "kakao_denied" : "kakao_failed");

  // 로그인을 시작한 이 브라우저가 적어 둔 state와 같아야 한다. 남이 만든 콜백 주소로는 로그인되지 않는다.
  const state = url.searchParams.get("state");
  if (!state || state !== cookies().get(KAKAO_STATE_COOKIE)?.value) return fail("kakao_failed");

  try {
    const { kakaoId, nickname } = await kakaoProfile(code, `${base}/api/auth/kakao/callback`);
    const user = await upsertAudience(kakaoId, nickname);
    // 토큰은 주소에 싣지 않는다(주소에 실으면 남이 자기 토큰을 넣은 링크로 로그인을 바꿔치기할 수 있다).
    // 잠깐 쓰는 쿠키에 넣어 두면 로그인 화면이 /api/auth/kakao/session으로 한 번 받아 간다.
    const res = NextResponse.redirect(`${base}/login?kakao=done`);
    res.cookies.set(KAKAO_STATE_COOKIE, "", kakaoCookie(base, 0));
    res.cookies.set(KAKAO_HANDOFF_COOKIE, createToken(user.id), kakaoCookie(base, 2 * 60));
    return res;
  } catch (error) {
    if (error instanceof LoginFailure) return fail(error.code);
    console.error(error);
    return fail("kakao_failed");
  }
}
