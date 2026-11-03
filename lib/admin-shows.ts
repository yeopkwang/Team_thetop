import { Prisma, ShowStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma";
import { HttpError } from "./http";
import { SEAT_HOLDING_STATUSES } from "./reservations";
import { logAudit } from "./audit";

const text = z.string().trim().max(10000).default("");

export const showInput = z.object({
  title: z.string().trim().min(1, "공연 제목을 입력해 주세요.").max(200),
  posterUrl: z.string().trim().max(1000).nullish().transform((v) => v || null),
  dateLabel: text,
  timeLabel: text,
  timeSubLabel: text,
  venue: text,
  venueAddress: text,
  contactName: text,
  contactTag: text,
  audienceInfo: text,
  notice: text,
  price: z.coerce.number().int().min(0, "관람료는 0원 이상이어야 합니다."),
  paymentBank: text,
  paymentAccount: text,
  paymentHolder: text,
  refundContact: text,
  introText: text,
  salesText: text,
  credits: text,
  salesOpenAt: z
    .string()
    .datetime({ message: "티켓 오픈 일시가 올바르지 않습니다." })
    .nullish()
    .transform((v) => (v ? new Date(v) : null)),
  status: z.nativeEnum(ShowStatus),
  session: z.object({
    title: z.string().trim().min(1).max(100).default("1회차"),
    date: z.string().datetime({ message: "공연 일시가 올바르지 않습니다." }),
    totalCapacity: z.coerce.number().int().min(1, "정원은 1명 이상이어야 합니다."),
  }),
});

export type ShowInput = z.infer<typeof showInput>;

export function parseShowInput(body: unknown) {
  const parsed = showInput.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || "입력값을 확인해 주세요.");
  return parsed.data;
}

async function seatHolding(sessionIds: string[], db: Prisma.TransactionClient = prisma) {
  if (sessionIds.length === 0) return 0;
  const reserved = await db.reservation.aggregate({
    where: { sessionId: { in: sessionIds }, status: { in: SEAT_HOLDING_STATUSES } },
    _sum: { qty: true },
  });
  return reserved._sum.qty || 0;
}

// 공연 관리 목록: 최근 공연부터, 회차 날짜와 좌석을 잡은 예매 수를 함께.
export async function listShows() {
  const shows = await prisma.show.findMany({
    include: { sessions: { orderBy: { date: "asc" }, select: { id: true, date: true, totalCapacity: true } } },
  });
  const rows = await Promise.all(
    shows.map(async (s) => ({
      id: s.id,
      title: s.title,
      posterUrl: s.posterUrl,
      dateLabel: s.dateLabel,
      status: s.status,
      firstDate: s.sessions[0]?.date ?? null,
      totalCapacity: s.sessions[0]?.totalCapacity ?? 0,
      reservedQty: await seatHolding(s.sessions.map((x) => x.id)),
      createdAt: s.createdAt,
    }))
  );
  const when = (r: (typeof rows)[number]) => (r.firstDate ?? r.createdAt).getTime();
  return rows.sort((a, b) => when(b) - when(a));
}

// 수정 화면용: 공연 필드 + 첫 회차 + 좌석을 잡은 예매 수
export async function loadShow(id: string) {
  const show = await prisma.show.findUnique({
    where: { id },
    include: { sessions: { orderBy: { date: "asc" }, take: 1 } },
  });
  if (!show) return null;
  const { sessions, ...fields } = show;
  const session = sessions[0] || null;
  return { ...fields, session, reservedQty: await seatHolding(session ? [session.id] : []) };
}

// 판매 중은 한 번에 하나: 다른 판매 중 공연은 지난 공연으로 옮긴다.
async function endOtherOnSale(tx: Prisma.TransactionClient, keepId: string | null) {
  await tx.show.updateMany({
    where: { status: ShowStatus.ON_SALE, ...(keepId ? { id: { not: keepId } } : {}) },
    data: { status: ShowStatus.ENDED },
  });
}

export async function createShow(input: ShowInput, actorUserId: string) {
  const { session, ...fields } = input;
  return prisma.$transaction(async (tx) => {
    if (fields.status === ShowStatus.ON_SALE) await endOtherOnSale(tx, null);
    const created = await tx.show.create({
      data: {
        ...fields,
        sessions: { create: { title: session.title, date: new Date(session.date), totalCapacity: session.totalCapacity } },
      },
    });
    await logAudit({ action: "SHOW_CREATED", entityType: "Show", entityId: created.id, actorUserId }, tx);
    return created.id;
  });
}

export async function updateShow(id: string, input: ShowInput, actorUserId: string) {
  const current = await loadShow(id);
  if (!current) throw new HttpError(404, "공연을 찾을 수 없어요.");
  const { session: sessionInput, ...fields } = input;
  const sessionData = {
    title: sessionInput.title,
    date: new Date(sessionInput.date),
    totalCapacity: sessionInput.totalCapacity,
  };

  await prisma.$transaction(async (tx) => {
    if (fields.status === ShowStatus.ON_SALE) await endOtherOnSale(tx, id);
    await tx.show.update({ where: { id }, data: fields });

    if (current.session) {
      // 예매 API와 같은 행을 잠그고 세야, 세는 사이에 들어온 예매까지 반영된다.
      await tx.$queryRaw`SELECT id FROM "ShowSession" WHERE id = ${current.session.id} FOR UPDATE`;
      const reservedQty = await seatHolding([current.session.id], tx);
      if (sessionInput.totalCapacity < reservedQty) {
        throw new HttpError(400, `이미 ${reservedQty}명이 예매해서 정원을 그보다 줄일 수 없습니다.`);
      }
      await tx.showSession.update({ where: { id: current.session.id }, data: sessionData });
    } else {
      await tx.showSession.create({ data: { ...sessionData, showId: id } });
    }
    await logAudit({ action: "SHOW_UPDATED", entityType: "Show", entityId: id, actorUserId }, tx);
  });
}

// 예매 기록이 하나라도 있으면 지우지 않는다(티켓·환불 기록이 공연에 매여 있다).
export async function deleteShow(id: string, actorUserId: string) {
  await prisma.$transaction(async (tx) => {
    const show = await tx.show.findUnique({ where: { id }, include: { sessions: { select: { id: true } } } });
    if (!show) throw new HttpError(404, "공연을 찾을 수 없어요.");
    const sessionIds = show.sessions.map((s) => s.id);
    const bookings = await tx.reservation.count({ where: { sessionId: { in: sessionIds } } });
    if (bookings > 0) {
      throw new HttpError(400, "예매 기록이 있는 공연은 지울 수 없어요. 상태를 '지난 공연'이나 '준비 중'으로 바꿔 주세요.");
    }
    await tx.showSession.deleteMany({ where: { showId: id } });
    await tx.show.delete({ where: { id } });
    await logAudit({ action: "SHOW_DELETED", entityType: "Show", entityId: id, actorUserId, before: { title: show.title } }, tx);
  });
}
