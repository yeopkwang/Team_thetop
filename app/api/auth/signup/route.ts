import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RoleType } from "@prisma/client";
import { createToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");

    if (!email || !password || !name) {
      return NextResponse.json({ error: "이름, 이메일, 비밀번호는 필수입니다." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
    }

    const userRole = await prisma.role.findUnique({ where: { type: RoleType.USER } });
    if (!userRole) {
      return NextResponse.json({ error: "USER role missing" }, { status: 500 });
    }

    const hash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          nickname: name,
          email,
        },
      });

      await tx.credential.create({
        data: {
          userId: user.id,
          username: email,
          passwordHash: hash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });

      return user;
    });

    const token = createToken(created.id);
    return NextResponse.json({
      token,
      user: { id: created.id, name: created.name, email: created.email },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
