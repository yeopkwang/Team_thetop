import { RoleType } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";
import { HttpError } from "./http";

const ROLE_ORDER = [RoleType.USER, RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];

function getUserIdFromAuthHeader() {
  const authHeader = headers().get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) throw new HttpError(401, "로그인이 필요합니다.");

  const payload = verifyToken(token);
  if (!payload?.userId) throw new HttpError(401, "인증이 만료되었습니다.");

  return payload.userId;
}

export async function requireSession() {
  const userId = getUserIdFromAuthHeader();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new HttpError(401, "사용자를 찾을 수 없습니다.");

  return { user };
}

export async function requireSessionWithRoles() {
  const userId = getUserIdFromAuthHeader();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      roles: {
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { role: { select: { type: true } } },
      },
    },
  });
  if (!user) throw new HttpError(401, "사용자를 찾을 수 없습니다.");

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role.type),
    },
  };
}

export async function requireRoleAtLeast(minimum: RoleType) {
  const session = await requireSessionWithRoles();
  const highest = Math.max(-1, ...session.user.roles.map((r) => ROLE_ORDER.indexOf(r)));
  if (highest < ROLE_ORDER.indexOf(minimum)) throw new HttpError(403, "권한이 없습니다.");
  return session;
}
