import { RoleType } from "@prisma/client";
import { auth } from "./auth";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession() {
  const session = await auth();
  if (!session || !session.user) {
    throw new HttpError(401, "로그인이 필요합니다");
  }
  return session;
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
