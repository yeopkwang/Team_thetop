import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { activeRoles, isAdminRole } from "@/lib/auth-helpers";
import { HttpError, readBody, route } from "@/lib/http";
import { loginInput } from "@/lib/inputs";
import { createToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const WRONG = "아이디나 비밀번호가 맞지 않아요.";
// 운영진 토큰은 관객(7일)보다 짧게 둔다. 공용 컴퓨터에서 로그아웃을 잊어도 하루 안에 풀린다.
const ADMIN_TOKEN_SECONDS = 12 * 60 * 60;

// 운영진 로그인(아이디·비밀번호). 관객은 카카오로만 로그인한다.
export const POST = route(async (req) => {
  const { id, password } = await readBody(req, loginInput);
  const credential = await prisma.credential.findUnique({
    where: { username: id },
    select: {
      passwordHash: true,
      user: { select: { id: true, name: true, roles: { where: activeRoles(), select: { role: { select: { type: true } } } } } },
    },
  });
  if (!credential || !(await bcrypt.compare(password, credential.passwordHash))) throw new HttpError(401, WRONG);

  const roles = credential.user.roles.map((r) => r.role.type);
  if (!isAdminRole(roles)) throw new HttpError(403, "관객은 카카오 로그인으로 들어와 주세요.");

  return NextResponse.json({
    token: createToken(credential.user.id, ADMIN_TOKEN_SECONDS),
    user: { id: credential.user.id, name: credential.user.name, roles },
  });
});
