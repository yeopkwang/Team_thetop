import { RoleType } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession() {
  const authHeader = headers().get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) throw new HttpError(401, "로그인이 필요합니다.");

  const payload = verifyToken(token);
  if (!payload?.userId) throw new HttpError(401, "인증이 만료되었습니다.");

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      roles: {
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { role: true },
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

export function assertRole(session: { user?: { roles?: RoleType[] } }, allowed: RoleType[]) {
  const roles: RoleType[] = session?.user?.roles || [];
  const ok = roles.some((r) => allowed.includes(r));
  if (!ok) throw new HttpError(403, "권한이 없습니다.");
}

export function assertRoleOrHigher(session: { user?: { roles?: RoleType[] } }, minimum: RoleType) {
  const order = [RoleType.USER, RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];
  const roles: RoleType[] = session?.user?.roles || [];
  const max = roles.reduce((acc, cur) => {
    const idx = order.indexOf(cur);
    return idx > acc ? idx : acc;
  }, -1);
  if (max < order.indexOf(minimum)) throw new HttpError(403, "권한이 없습니다.");
}

export async function requireRole(allowed: RoleType[]) {
  const session = await requireSession();
  assertRole(session, allowed);
  return session;
}

export async function requireRoleAtLeast(minimum: RoleType) {
  const session = await requireSession();
  assertRoleOrHigher(session, minimum);
  return session;
}
