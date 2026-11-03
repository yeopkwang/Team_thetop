import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";
import { createToken } from "@/lib/jwt";

type KakaoTokenResponse = {
  access_token: string;
};

type KakaoUserResponse = {
  id: number;
  properties?: {
    nickname?: string;
  };
  kakao_account?: {
    email?: string;
  };
};

function getBaseUrl(req: Request) {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(`${getBaseUrl(req)}/login?error=${encodeURIComponent("카카오 인증 코드가 없습니다.")}`);
    }

    const clientId = process.env.KAKAO_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(`${getBaseUrl(req)}/login?error=${encodeURIComponent("KAKAO_CLIENT_ID가 없습니다.")}`);
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/kakao/callback`;
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    });
    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenBody.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
    }

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: tokenBody.toString(),
    });
    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${getBaseUrl(req)}/login?error=${encodeURIComponent("카카오 토큰 발급에 실패했습니다.")}`
      );
    }
    const tokenData = (await tokenRes.json()) as KakaoTokenResponse;

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.redirect(
        `${getBaseUrl(req)}/login?error=${encodeURIComponent("카카오 사용자 조회에 실패했습니다.")}`
      );
    }
    const profile = (await profileRes.json()) as KakaoUserResponse;

    const kakaoId = String(profile.id);
    const email = profile.kakao_account?.email?.toLowerCase() || null;
    const nickname = profile.properties?.nickname || "KAKAO USER";

    const userRole = await prisma.role.findUnique({ where: { type: RoleType.USER } });
    if (!userRole) {
      return NextResponse.redirect(`${getBaseUrl(req)}/login?error=${encodeURIComponent("USER role missing")}`);
    }

    const user = await prisma.$transaction(async (tx) => {
      let found = await tx.user.findUnique({
        where: { kakaoId },
        include: { roles: { where: { isActive: true }, include: { role: true } } },
      });

      if (!found && email) {
        found = await tx.user.findUnique({
          where: { email },
          include: { roles: { where: { isActive: true }, include: { role: true } } },
        });
        if (found) {
          found = await tx.user.update({
            where: { id: found.id },
            data: { kakaoId, nickname, name: found.name || nickname },
            include: { roles: { where: { isActive: true }, include: { role: true } } },
          });
        }
      }

      if (!found) {
        found = await tx.user.create({
          data: {
            kakaoId,
            email,
            name: nickname,
            nickname,
          },
          include: { roles: { where: { isActive: true }, include: { role: true } } },
        });
      }

      const roles = found.roles.map((r) => r.role.type);
      if (roles.includes(RoleType.ADMIN) || roles.includes(RoleType.SUPER_ADMIN)) {
        throw new Error("관리자 계정은 ID/PW 로그인만 허용됩니다.");
      }

      const hasUserRole = roles.includes(RoleType.USER);
      if (!hasUserRole) {
        await tx.userRole.create({
          data: {
            userId: found.id,
            roleId: userRole.id,
          },
        });
      }

      return found;
    });

    const appToken = createToken(user.id);
    return NextResponse.redirect(`${getBaseUrl(req)}/login?kakaoToken=${encodeURIComponent(appToken)}`);
  } catch (error: any) {
    const message = error?.message || "카카오 로그인 처리에 실패했습니다.";
    return NextResponse.redirect(`${getBaseUrl(req)}/login?error=${encodeURIComponent(message)}`);
  }
}
