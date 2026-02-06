import { RoleType } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 로그인 없이도 접근 가능하도록 게스트 세션을 반환한다.
export async function requireSession() {
  const session = await auth();
  if (session && session.user) return session;

  const guest = await prisma.user.upsert({
    where: { email: "guest@example.com" },
    update: {},
    create: { email: "guest@example.com", name: "GUEST USER", nickname: "guest" },
  });

  const rolesToAssign = [RoleType.USER, RoleType.SUPER_ADMIN];
  for (const type of rolesToAssign) {
    const role = await prisma.role.findUnique({ where: { type } });
    if (role) {
      await prisma.userRole.upsert({
        where: { userId_roleId_isActive: { userId: guest.id, roleId: role.id, isActive: true } },
        update: {},
        create: { userId: guest.id, roleId: role.id },
      });
    }
  }

  return {
    user: {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      kakaoId: guest.kakaoId,
      roles: rolesToAssign,
    },
  } as any;
}

export function assertRole(session: any, allowed: RoleType[]) {
  const roles: RoleType[] = (session?.user?.roles as RoleType[]) || [];
  const ok = roles.some((r) => allowed.includes(r));
  if (!ok) throw new HttpError(403, "권한이 없습니다");
}

export function assertRoleOrHigher(session: any, minimum: RoleType) {
  const order = [RoleType.USER, RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];
  const roles: RoleType[] = (session?.user?.roles as RoleType[]) || [];
  const max = roles.reduce((acc, cur) => {
    const idx = order.indexOf(cur);
    return idx > acc ? idx : acc;
  }, -1);
  if (max < order.indexOf(minimum)) throw new HttpError(403, "권한이 없습니다");
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
