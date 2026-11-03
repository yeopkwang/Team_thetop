import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken } from "@/lib/jwt";
import { RoleType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || body?.username || body?.email || "").trim();
    const password = String(body?.password || "");

    if (!id || !password) {
      return NextResponse.json({ error: "ID와 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const credential = await prisma.credential.findFirst({
      where: {
        OR: [{ username: id }, { user: { email: id.toLowerCase() } }],
      },
      include: {
        user: {
          include: {
            roles: {
              where: {
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!credential?.user) {
      return NextResponse.json({ error: "로그인 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, credential.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "로그인 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const roles = credential.user.roles.map((r) => r.role.type);
    const isAdmin = roles.includes(RoleType.ADMIN) || roles.includes(RoleType.SUPER_ADMIN);
    if (!isAdmin) {
      return NextResponse.json({ error: "일반 사용자는 카카오 로그인만 지원합니다." }, { status: 403 });
    }

    const token = createToken(credential.user.id);
    return NextResponse.json({
      token,
      user: {
        id: credential.user.id,
        name: credential.user.name,
        email: credential.user.email,
        roles,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
