// 운영진 계정(아이디·비밀번호): 로그인, 계정 만들기·지우기, 비밀번호 바꾸기.
// 관객은 카카오로만 들어오므로 여기에 나오지 않는다.
import { Prisma, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";
import { activeRoles } from "./auth-helpers";
import { HttpError } from "./http";
import { LOCK_KEYS, advisoryLock } from "./locks";
import { prisma } from "./prisma";
import { staffLevel } from "./roles";

const WRONG = "아이디나 비밀번호가 맞지 않아요.";
const BCRYPT_ROUNDS = 10;

// 같은 아이디로 15분 안에 10번 틀리면 15분 동안 막는다(비밀번호를 하나씩 넣어 보는 공격 막기).
export const LOGIN_LOCK = { failures: 10, minutes: 15 };

const STAFF_ROLES: RoleType[] = [RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];
const ADMIN_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.SUPER_ADMIN];

const rolesSelect = { roles: { where: activeRoles(), select: { role: { select: { type: true } } } } } satisfies Prisma.UserSelect;

// 운영진 로그인. 맞으면 사용자와 역할을, 틀리면 실패를 기록하고 401을 낸다.
export async function loginWithPassword(username: string, password: string) {
  const since = new Date(Date.now() - LOGIN_LOCK.minutes * 60 * 1000);
  const failures = await prisma.auditLog.count({ where: { action: "LOGIN_FAILED", entityId: username, createdAt: { gte: since } } });
  if (failures >= LOGIN_LOCK.failures) {
    throw new HttpError(429, `비밀번호를 여러 번 틀려서 잠시 막아 뒀어요. ${LOGIN_LOCK.minutes}분 뒤 다시 시도해 주세요.`);
  }

  const credential = await prisma.credential.findUnique({
    where: { username },
    select: { passwordHash: true, user: { select: { id: true, name: true, ...rolesSelect } } },
  });
  if (!credential || !(await bcrypt.compare(password, credential.passwordHash))) {
    await logAudit({ action: "LOGIN_FAILED", entityType: "Credential", entityId: username });
    throw new HttpError(401, WRONG);
  }

  const roles = credential.user.roles.map((r) => r.role.type);
  if (!staffLevel(roles)) throw new HttpError(403, "운영진 권한이 없는 계정이에요. 관객은 카카오 로그인으로 들어와 주세요.");
  return { id: credential.user.id, name: credential.user.name, roles };
}

// 운영진 계정 목록: 아이디가 있는 계정만(관객은 카카오 계정이라 아이디가 없다).
export async function listAccounts(meId: string) {
  const rows = await prisma.credential.findMany({
    select: { username: true, user: { select: { id: true, name: true, createdAt: true, ...rolesSelect } } },
    orderBy: { user: { createdAt: "asc" } },
  });
  return rows.map((r) => {
    const roles = r.user.roles.map((x) => x.role.type);
    return {
      id: r.user.id,
      username: r.username,
      name: r.user.name || r.username,
      role: roles.find((t) => ADMIN_ROLES.includes(t)) ?? roles.find((t) => t === RoleType.STAFF) ?? null,
      isMe: r.user.id === meId,
      createdAt: r.user.createdAt,
    };
  });
}

export type AccountInput = { username: string; name: string; password: string; role: "ADMIN" | "STAFF" };

export async function createAccount(input: AccountInput, actorUserId: string) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, LOCK_KEYS.accounts);
    if (await tx.credential.findUnique({ where: { username: input.username }, select: { id: true } })) {
      throw new HttpError(409, "이미 있는 아이디예요. 다른 아이디를 적어 주세요.");
    }
    const role = await tx.role.findUniqueOrThrow({ where: { type: input.role } });
    // 시드가 만든 관리자와 같은 꼴(아이디@admin.local). 지웠던 아이디를 다시 만들면 예전 사용자에 다시 붙는다.
    const email = `${input.username}@admin.local`;
    const user = await tx.user.upsert({
      where: { email },
      update: { name: input.name },
      create: { email, name: input.name, nickname: input.username },
    });
    await tx.credential.create({ data: { username: input.username, passwordHash, userId: user.id } });
    await tx.userRole.deleteMany({ where: { userId: user.id } });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    await logAudit(
      { action: "ACCOUNT_CREATED", entityType: "User", entityId: user.id, actorUserId, after: { username: input.username, role: input.role } },
      tx
    );
    return user.id;
  });
}

// 계정 지우기: 아이디·비밀번호와 운영진 역할을 지운다. 작업 기록에 이름이 남아 있으므로 사용자 행은 둔다.
// 내 계정, 마지막 관리자 계정은 지우지 않는다(아무도 관리자 화면에 못 들어가게 되므로).
export async function deleteAccount(userId: string, actorUserId: string) {
  if (userId === actorUserId) throw new HttpError(400, "내 계정은 지울 수 없어요. 다른 관리자에게 부탁해 주세요.");
  await prisma.$transaction(async (tx) => {
    // 두 관리자가 서로를 동시에 지워 관리자가 0명이 되는 일을 막는다.
    await advisoryLock(tx, LOCK_KEYS.accounts);
    const credential = await tx.credential.findUnique({
      where: { userId },
      select: { username: true, user: { select: rolesSelect } },
    });
    if (!credential) throw new HttpError(404, "계정을 찾을 수 없어요.");

    const isAdmin = credential.user.roles.some((r) => ADMIN_ROLES.includes(r.role.type));
    if (isAdmin) {
      const admins = await tx.credential.count({
        where: { user: { roles: { some: { ...activeRoles(), role: { type: { in: ADMIN_ROLES } } } } } },
      });
      if (admins <= 1) throw new HttpError(400, "마지막 관리자 계정은 지울 수 없어요. 다른 관리자 계정을 먼저 만들어 주세요.");
    }

    await tx.userRole.deleteMany({ where: { userId, role: { type: { in: STAFF_ROLES } } } });
    await tx.credential.delete({ where: { userId } });
    await logAudit({ action: "ACCOUNT_DELETED", entityType: "User", entityId: userId, actorUserId, before: { username: credential.username } }, tx);
  });
}

// 관리자가 다른 운영진의 비밀번호를 새로 정해 준다(잊어버렸을 때).
export async function resetPassword(userId: string, password: string, actorUserId: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.credential.updateMany({ where: { userId }, data: { passwordHash } });
    if (updated.count === 0) throw new HttpError(404, "계정을 찾을 수 없어요.");
    await logAudit({ action: "PASSWORD_RESET", entityType: "User", entityId: userId, actorUserId }, tx);
  });
}

// 내 비밀번호 바꾸기. 지금 비밀번호가 맞아야 한다.
export async function changeOwnPassword(userId: string, current: string, next: string) {
  const credential = await prisma.credential.findUnique({ where: { userId }, select: { passwordHash: true } });
  if (!credential) throw new HttpError(400, "아이디로 로그인한 계정만 비밀번호를 바꿀 수 있어요.");
  if (!(await bcrypt.compare(current, credential.passwordHash))) throw new HttpError(400, "지금 비밀번호가 맞지 않아요.");
  if (current === next) throw new HttpError(400, "새 비밀번호가 지금 비밀번호와 같아요.");

  const passwordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.credential.update({ where: { userId }, data: { passwordHash } });
    await logAudit({ action: "PASSWORD_CHANGED", entityType: "User", entityId: userId, actorUserId: userId }, tx);
  });
}
