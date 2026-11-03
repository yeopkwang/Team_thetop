// 운영진 계정(아이디·비밀번호): 로그인, 계정 만들기·지우기, 비밀번호 바꾸기.
// 관객은 카카오로만 들어오므로 여기에 나오지 않는다.
import { Prisma, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logAudit } from "./audit";
import { activeRoles } from "./auth-helpers";
import { HttpError } from "./http";
import { LOCK_KEYS, advisoryLock, advisoryLockFor } from "./locks";
import { prisma } from "./prisma";
import { QUEUED_TX } from "./reservations";
import { staffLevel } from "./roles";

const WRONG = "아이디나 비밀번호가 맞지 않아요.";
// 운영진 토큰은 관객(7일)보다 짧게 둔다. 공용 컴퓨터에서 로그아웃을 잊어도 하루 안에 풀린다.
export const STAFF_TOKEN_SECONDS = 12 * 60 * 60;
const BCRYPT_ROUNDS = 10;
// 없는 아이디로 로그인할 때도 비밀번호를 맞춰 보는 만큼 시간을 쓰려고 쓰는 값(무작위 문자열의 해시).
// 응답이 빠르면 '이 아이디는 없다'는 걸 알아낼 수 있다.
const DUMMY_HASH = "$2a$10$zitglbMlV447KvpYjthdge2sToa7RDDiu/Z9DcyI6YODhGUHzLsji";

// 비밀번호를 하나씩 넣어 보는 공격 막기. 15분 안에
// - 같은 아이디를 같은 곳(IP)에서 10번 틀리면 그곳에서만 막는다.
// - 같은 아이디를 여러 곳에서 합쳐 50번 틀리면 그 아이디를 막는다.
// 한 곳에서 일부러 틀려도 다른 곳(공연장의 스태프 휴대폰)에서는 로그인할 수 있게 하려고 나눴다.
export const LOGIN_LOCK = { perPlace: 10, perAccount: 50, minutes: 15 };

const STAFF_ROLES: RoleType[] = [RoleType.STAFF, RoleType.ADMIN, RoleType.SUPER_ADMIN];
const ADMIN_ROLES: RoleType[] = [RoleType.ADMIN, RoleType.SUPER_ADMIN];

// activeRoles()는 '지금' 기준이라 부를 때마다 새로 만든다(모듈을 불러온 때로 굳으면 기한 지난 역할이 살아 있는 것처럼 보인다).
const rolesSelect = () => ({ roles: { where: activeRoles(), select: { role: { select: { type: true } } } } }) satisfies Prisma.UserSelect;

// 운영진 로그인. 맞으면 사용자와 역할을 돌려주고, 틀리면 실패를 기록하고 401을 낸다.
export async function loginWithPassword(username: string, password: string, ip: string) {
  const outcome = await prisma.$transaction(async (tx) => {
    // 같은 아이디의 로그인 시도를 한 줄로 세운다. 동시에 수백 번 보내도 '실패 횟수를 세고 → 기록하는' 사이에 끼어들지 못한다.
    await advisoryLockFor(tx, `login:${username}`);
    const since = new Date(Date.now() - LOGIN_LOCK.minutes * 60 * 1000);
    const recent = await tx.auditLog.findMany({
      where: { action: "LOGIN_FAILED", entityId: username, createdAt: { gte: since } },
      select: { afterJson: true },
    });
    const fromHere = recent.filter((r) => (r.afterJson as { ip?: string } | null)?.ip === ip).length;
    if (fromHere >= LOGIN_LOCK.perPlace || recent.length >= LOGIN_LOCK.perAccount) return { kind: "locked" as const };

    const credential = await tx.credential.findUnique({
      where: { username },
      select: { passwordHash: true, user: { select: { id: true, name: true, ...rolesSelect() } } },
    });
    const matches = await bcrypt.compare(password, credential?.passwordHash ?? DUMMY_HASH);
    if (!credential || !matches) {
      // 있는 아이디만 기록한다. 없는 아이디는 비밀번호를 아이디 칸에 잘못 친 것일 수도 있어서 남기지 않는다.
      if (credential) await logAudit({ action: "LOGIN_FAILED", entityType: "Credential", entityId: username, after: { ip } }, tx);
      return { kind: "wrong" as const };
    }
    return { kind: "ok" as const, user: credential.user };
  }, QUEUED_TX);

  if (outcome.kind === "locked") {
    throw new HttpError(429, `비밀번호를 여러 번 틀려서 잠시 막아 뒀어요. ${LOGIN_LOCK.minutes}분 뒤 다시 시도해 주세요.`);
  }
  if (outcome.kind === "wrong") throw new HttpError(401, WRONG);

  const roles = outcome.user.roles.map((r) => r.role.type);
  if (!staffLevel(roles)) throw new HttpError(403, "운영진 권한이 없는 계정이에요. 관객은 카카오 로그인으로 들어와 주세요.");
  return { id: outcome.user.id, name: outcome.user.name, roles };
}

// 운영진 계정 목록: 아이디가 있는 계정만(관객은 카카오 계정이라 아이디가 없다).
export async function listAccounts(meId: string) {
  const rows = await prisma.credential.findMany({
    select: { username: true, user: { select: { id: true, name: true, createdAt: true, ...rolesSelect() } } },
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

// 잠금을 잡은 뒤에 한 번 더: 그사이 내 관리자 권한이 지워졌으면 멈춘다(서로를 동시에 지우는 경우).
async function assertStillAdmin(tx: Prisma.TransactionClient, userId: string) {
  const active = await tx.userRole.count({ where: { userId, ...activeRoles(), role: { type: { in: ADMIN_ROLES } } } });
  if (active === 0) throw new HttpError(403, "권한이 없어요.");
}

export type AccountInput = { username: string; name: string; password: string; role: "ADMIN" | "STAFF" };

// 계정 만들기. 늘 새 사용자로 만든다. 지운 아이디를 다시 쓰더라도 예전 사람의 작업 기록에 새 사람 이름이 붙지 않게.
export async function createAccount(input: AccountInput, actorUserId: string) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return prisma.$transaction(async (tx) => {
    await advisoryLock(tx, LOCK_KEYS.accounts);
    await assertStillAdmin(tx, actorUserId);
    if (await tx.credential.findUnique({ where: { username: input.username }, select: { id: true } })) {
      throw new HttpError(409, "이미 있는 아이디예요. 다른 아이디를 적어 주세요.");
    }
    const role = await tx.role.findUniqueOrThrow({ where: { type: input.role } });
    // 시드가 만든 관리자와 같은 꼴(아이디@admin.local). 예전에 지운 계정이 이 주소를 갖고 있으면 비워 준다.
    const email = `${input.username}@admin.local`;
    await tx.user.updateMany({ where: { email, credential: null }, data: { email: null } });
    const user = await tx.user.create({ data: { email, name: input.name, nickname: input.username } });
    await tx.credential.create({ data: { username: input.username, passwordHash, userId: user.id } });
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
    await assertStillAdmin(tx, actorUserId);
    const credential = await tx.credential.findUnique({
      where: { userId },
      select: { username: true, user: { select: rolesSelect() } },
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

// 관리자가 다른 운영진의 비밀번호를 새로 정해 준다(잊어버렸을 때). 그 사람이 이미 받은 로그인은 끊긴다.
export async function resetPassword(userId: string, password: string, actorUserId: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.credential.updateMany({ where: { userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    if (updated.count === 0) throw new HttpError(404, "계정을 찾을 수 없어요.");
    await logAudit({ action: "PASSWORD_RESET", entityType: "User", entityId: userId, actorUserId }, tx);
  });
}

// 내 비밀번호 바꾸기. 지금 비밀번호가 맞아야 한다. 다른 기기에서 받은 로그인은 끊기므로, 이 기기에는 새 토큰을 준다(라우트가 발급).
export async function changeOwnPassword(userId: string, current: string, next: string) {
  const credential = await prisma.credential.findUnique({ where: { userId }, select: { passwordHash: true } });
  if (!credential) throw new HttpError(400, "아이디로 로그인한 계정만 비밀번호를 바꿀 수 있어요.");
  if (!(await bcrypt.compare(current, credential.passwordHash))) throw new HttpError(400, "지금 비밀번호가 맞지 않아요.");
  if (current === next) throw new HttpError(400, "새 비밀번호가 지금 비밀번호와 같아요.");

  const passwordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
  await prisma.$transaction(async (tx) => {
    await tx.credential.update({ where: { userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await logAudit({ action: "PASSWORD_CHANGED", entityType: "User", entityId: userId, actorUserId: userId }, tx);
  });
}
