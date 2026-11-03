import { Prisma, RoleType } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { verifyToken } from "./jwt";
import { HttpError } from "./http";

const ROLE_ORDER = [RoleType.USER, RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];

// 지금 유효한 역할: 꺼지지 않았고, 기한이 없거나 아직 남은 것. 로그인·카카오 로그인·권한 확인이 모두 이 조건을 쓴다.
export function activeRoles(): Prisma.UserRoleWhereInput {
  return { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}

function tokenFromAuthHeader() {
  const authHeader = headers().get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!token) throw new HttpError(401, "로그인이 필요해요.");

  const payload = verifyToken(token);
  if (!payload) throw new HttpError(401, "로그인이 만료됐어요. 다시 로그인해 주세요.");
  return payload;
}

// 로그인한 사용자와 지금 유효한 역할.
// 비밀번호를 바꾼 뒤에는 그 전에 받은 토큰을 받지 않는다(새어 나간 비밀번호로 이미 로그인한 사람을 끊으려고).
export async function requireSession() {
  const token = tokenFromAuthHeader();
  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: {
      id: true,
      name: true,
      credential: { select: { passwordChangedAt: true } },
      roles: { where: activeRoles(), select: { role: { select: { type: true } } } },
    },
  });
  if (!user) throw new HttpError(401, "로그인이 만료됐어요. 다시 로그인해 주세요.");
  const changedAt = user.credential?.passwordChangedAt;
  if (changedAt && (token.iat ?? 0) < Math.floor(changedAt.getTime() / 1000)) {
    throw new HttpError(401, "비밀번호가 바뀌었어요. 다시 로그인해 주세요.");
  }
  return { user: { id: user.id, name: user.name, roles: user.roles.map((r) => r.role.type) } };
}

// minimum 이상의 역할이 있어야 통과한다(USER < STAFF < ADMIN < SUPER_ADMIN).
export async function requireRoleAtLeast(minimum: RoleType) {
  const session = await requireSession();
  const highest = Math.max(-1, ...session.user.roles.map((r) => ROLE_ORDER.indexOf(r)));
  if (highest < ROLE_ORDER.indexOf(minimum)) throw new HttpError(403, "권한이 없어요.");
  return session;
}
