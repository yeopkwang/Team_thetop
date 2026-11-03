// 관리자 > 작업 기록: AuditLog를 사람이 읽는 문장으로 바꿔 최근 것부터 보여 준다.
import type { AuditLog, Prisma } from "@prisma/client";
import { bookingNumber, formatSessionDate } from "./format";
import type { LogKind } from "./log-kinds";
import { prisma } from "./prisma";
import { ROLE_INFO } from "./roles";

type Json = Record<string, unknown> | null;

// 기록 종류별 이름과 덧붙일 설명. 새 기록(logAudit의 action)을 만들면 여기에도 한 줄 넣는다.
const ACTIONS: Record<string, { label: string; kind: LogKind; detail?: (before: Json, after: Json) => string }> = {
  BOOKING_CONFIRMED: {
    label: "입금 확인",
    kind: "booking",
    detail: (before) => (before?.status === "EXPIRED" ? "기한이 지나 만료된 예매를 되살렸어요." : ""),
  },
  BOOKING_CANCELLED: { label: "관객이 예매 취소", kind: "booking" },
  BOOKING_CANCELLED_BY_STAFF: { label: "운영진이 예매 취소", kind: "booking", detail: (_b, after) => text(after?.reason, "사유: ") },
  DEPOSITOR_CHANGED: {
    label: "관객이 입금자명 수정",
    kind: "booking",
    detail: (before, after) => `${text(before?.depositorName)} → ${text(after?.depositorName)}`,
  },
  CHECKIN_CREATED: { label: "입장 확인", kind: "booking", detail: (_b, after) => text(after?.method, "", "으로 확인") },
  REFUND_REQUESTED: { label: "관객이 환불 요청", kind: "booking" },
  REFUND_REVERTED: { label: "환불 요청 되돌림", kind: "booking" },
  REFUND_COMPLETED: {
    label: "환불 완료",
    kind: "booking",
    detail: (_b, after) => [after?.bank, after?.account, after?.holder].filter(Boolean).join(" "),
  },
  SHOW_CREATED: { label: "공연 등록", kind: "show" },
  SHOW_UPDATED: { label: "공연 수정", kind: "show" },
  SHOW_DELETED: { label: "공연 삭제", kind: "show" },
  ASSET_UPLOADED: { label: "포스터 이미지 올림", kind: "show" },
  ACCOUNT_CREATED: {
    label: "운영진 계정 만듦",
    kind: "account",
    detail: (_b, after) => ROLE_INFO[String(after?.role)]?.label ?? "",
  },
  ACCOUNT_DELETED: { label: "운영진 계정 지움", kind: "account" },
  PASSWORD_RESET: { label: "비밀번호를 새로 정해 줌", kind: "account" },
  PASSWORD_CHANGED: { label: "내 비밀번호 바꿈", kind: "account" },
  LOGIN_FAILED: { label: "로그인 실패", kind: "account", detail: () => "아이디나 비밀번호가 틀렸어요." },
};


function text(value: unknown, prefix = "", suffix = "") {
  return typeof value === "string" && value ? `${prefix}${value}${suffix}` : "";
}

// 기록이 가리키는 대상(예매자, 공연, 계정)의 이름을 한 번에 찾아 둔다.
async function targetNames(logs: AuditLog[]) {
  const ids = (type: string) => Array.from(new Set(logs.filter((l) => l.entityType === type).map((l) => l.entityId)));
  const [reservations, shows, credentials] = await Promise.all([
    prisma.reservation.findMany({
      where: { id: { in: ids("Reservation") } },
      select: { id: true, depositorName: true, user: { select: { name: true } } },
    }),
    prisma.show.findMany({ where: { id: { in: ids("Show") } }, select: { id: true, title: true } }),
    prisma.credential.findMany({ where: { userId: { in: ids("User") } }, select: { userId: true, username: true } }),
  ]);
  const names = new Map<string, string>();
  for (const r of reservations) names.set(r.id, `${r.depositorName || r.user.name || "관객"} (예매번호 ${bookingNumber(r.id)})`);
  for (const s of shows) names.set(s.id, s.title);
  for (const c of credentials) names.set(c.userId, c.username);
  return names;
}

function targetOf(log: AuditLog, names: Map<string, string>) {
  const before = log.beforeJson as Json;
  const after = log.afterJson as Json;
  const known = names.get(log.entityId);
  if (known) return known;
  if (log.entityType === "Credential") return log.entityId; // 로그인 실패: 적은 아이디
  return text(before?.title) || text(before?.username) || text(after?.username) || (log.entityType === "Asset" ? "이미지" : "");
}

const PAGE = 50;

// 최근 기록부터 50개씩. kind로 종류를 거른다. cursor는 앞 페이지 마지막 기록의 id.
export async function listAuditLogs(kind?: LogKind, cursor?: string) {
  const actions = kind ? Object.keys(ACTIONS).filter((a) => ACTIONS[a].kind === kind) : undefined;
  const where: Prisma.AuditLogWhereInput = actions ? { action: { in: actions } } : {};
  const rows = await prisma.auditLog.findMany({
    where,
    take: PAGE + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { actorUser: { select: { name: true, credential: { select: { username: true } } } } },
  });
  const page = rows.slice(0, PAGE);
  const names = await targetNames(page);

  return {
    logs: page.map((log) => {
      const info = ACTIONS[log.action];
      const actor = log.actorUser;
      return {
        id: log.id,
        at: log.createdAt,
        atText: formatSessionDate(log.createdAt),
        action: info?.label ?? log.action,
        kind: info?.kind ?? null,
        // 운영진은 '이름(아이디)', 관객은 카카오 이름, 사람이 아닌 기록(로그인 실패)은 빈칸
        actor: actor ? (actor.credential ? `${actor.name || actor.credential.username} (${actor.credential.username})` : actor.name || "관객") : "",
        target: targetOf(log, names),
        detail: info?.detail?.(log.beforeJson as Json, log.afterJson as Json) ?? "",
      };
    }),
    nextCursor: rows.length > PAGE ? (page[page.length - 1]?.id ?? null) : null,
  };
}
