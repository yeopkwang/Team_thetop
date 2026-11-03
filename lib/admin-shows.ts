import { Prisma, ReservationStatus, ShowStatus } from "@prisma/client";
import { z } from "zod";
import { logAudit } from "./audit";
import { HttpError } from "./http";
import { prisma } from "./prisma";
import { SEAT_HOLDING_STATUSES, expireOverdue, lockSession, paymentDeadline, seatsHeld } from "./reservations";
import { normalizeSetlist } from "./setlist";

const text = z.string({ invalid_type_error: "글자로 적어 주세요." }).trim().max(10000, "안내문은 10,000자 안으로 적어 주세요.").default("");
const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ invalid_type_error: `${label}은(는) 숫자로 적어 주세요.` })
    .int(`${label}은(는) 정수로 적어 주세요.`)
    .min(min, `${label}은(는) ${min.toLocaleString("ko-KR")} 이상이어야 해요.`)
    .max(max, `${label}은(는) ${max.toLocaleString("ko-KR")} 이하로 적어 주세요.`);
const isoDate = (message: string) => z.string({ invalid_type_error: message, required_error: message }).datetime({ message });

// 포스터 주소: 이 사이트 안의 경로(/posters/…, /api/assets/…)나 https 주소만 받는다.
const posterUrl = z
  .string()
  .trim()
  .max(1000)
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || (v.startsWith("/") && !v.startsWith("//")) || v.startsWith("https://"), {
    message: "포스터 주소는 '이미지 올리기'로 받은 주소나 https://로 시작하는 주소여야 해요.",
  });

export const showInput = z.object({
  title: z.string({ required_error: "공연명을 적어 주세요." }).trim().min(1, "공연명을 적어 주세요.").max(200, "공연명은 200자 안으로 적어 주세요."),
  posterUrl,
  dateLabel: text,
  timeLabel: text,
  timeSubLabel: text,
  venue: text,
  venueAddress: text,
  contactName: text,
  contactTag: text,
  audienceInfo: text,
  notice: text,
  price: wholeNumber("관람료", 0, 1_000_000),
  paymentBank: text,
  paymentAccount: text,
  paymentHolder: text,
  refundContact: text,
  introText: text,
  salesText: text,
  credits: text,
  // 모양은 normalizeSetlist가 정리한다(빈 곡·빈 묶음은 버린다).
  setlist: z
    .unknown()
    .optional()
    .transform((v) => normalizeSetlist(v) as unknown as Prisma.InputJsonValue),
  setlistPublic: z.boolean().default(false),
  paymentHours: wholeNumber("입금 기한(시간)", 0, 24 * 14).default(24),
  salesOpenAt: isoDate("티켓 오픈 일시가 올바르지 않아요.")
    .nullish()
    .transform((v) => (v ? new Date(v) : null)),
  status: z.nativeEnum(ShowStatus, { errorMap: () => ({ message: "공연 상태를 골라 주세요." }) }),
  session: z.object(
    {
      title: z.string().trim().min(1).max(100).catch("1회차"),
      date: isoDate("공연 일시를 적어 주세요."),
      totalCapacity: wholeNumber("정원", 1, 100_000),
    },
    { required_error: "공연 일시와 정원을 적어 주세요." }
  ),
});

export type ShowInput = z.infer<typeof showInput>;

// 공연 관리 목록: 최근 공연부터, 회차 날짜와 좌석을 잡은 예매 수를 함께.
// 예매 수는 공연마다 따로 묻지 않고 한 번에 센다(DB 왕복 횟수가 곧 속도라서).
export async function listShows() {
  await expireOverdue();
  const shows = await prisma.show.findMany({
    select: {
      id: true,
      title: true,
      posterUrl: true,
      dateLabel: true,
      status: true,
      createdAt: true,
      sessions: { orderBy: { date: "asc" }, select: { id: true, date: true, totalCapacity: true } },
    },
  });
  const sessionIds = shows.flatMap((s) => s.sessions.map((x) => x.id));
  const held = sessionIds.length
    ? await prisma.reservation.groupBy({
        by: ["sessionId"],
        where: { sessionId: { in: sessionIds }, status: { in: SEAT_HOLDING_STATUSES } },
        _sum: { qty: true },
      })
    : [];
  const heldBySession = new Map(held.map((h) => [h.sessionId, h._sum.qty || 0]));
  const rows = shows.map((s) => ({
    id: s.id,
    title: s.title,
    posterUrl: s.posterUrl,
    dateLabel: s.dateLabel,
    status: s.status,
    firstDate: s.sessions[0]?.date ?? null,
    totalCapacity: s.sessions[0]?.totalCapacity ?? 0,
    reservedQty: s.sessions.reduce((sum, x) => sum + (heldBySession.get(x.id) || 0), 0),
    createdAt: s.createdAt,
  }));
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
  return { ...fields, session, reservedQty: await seatsHeld(prisma, session ? [session.id] : []) };
}

// 공연을 만들거나 고치는 트랜잭션을 한 줄로 세운다. 두 관리자가 동시에 서로 다른 공연을 '판매 중'으로 저장해도
// 앞 사람이 끝난 뒤에 뒷사람이 다른 판매 중 공연을 정리하므로 판매 중이 둘이 되지 않는다.
const SHOW_WRITE_LOCK = 20270221;
async function lockShowWrites(tx: Prisma.TransactionClient) {
  // pg_advisory_xact_lock은 void를 돌려줘서 Prisma가 읽지 못한다. 글자로 바꿔 받는다.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${SHOW_WRITE_LOCK})::text AS locked`;
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
    await lockShowWrites(tx);
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
    await lockShowWrites(tx);
    if (fields.status === ShowStatus.ON_SALE) await endOtherOnSale(tx, id);
    await tx.show.update({ where: { id }, data: fields });

    if (current.session) {
      // 예매 API와 같은 행을 잠그고 세야, 세는 사이에 들어온 예매까지 반영된다.
      await lockSession(tx, current.session.id);
      await expireOverdue({ sessionId: current.session.id }, tx);
      const reservedQty = await seatsHeld(tx, [current.session.id]);
      if (sessionInput.totalCapacity < reservedQty) {
        throw new HttpError(400, `이미 ${reservedQty}명이 예매해서 정원을 그보다 줄일 수 없어요.`);
      }
      await tx.showSession.update({ where: { id: current.session.id }, data: sessionData });

      // 공연 일시나 입금 기한을 바꾸면 입금 대기 중인 예매의 기한도 다시 맞춘다.
      // 관객에게 이미 안내한 기한보다 앞당기지는 않고, 공연 시작 시각은 넘기지 않는다.
      const moved = sessionData.date.getTime() !== current.session.date.getTime();
      if (moved || fields.paymentHours !== current.paymentHours) {
        const pending = await tx.reservation.findMany({
          where: { sessionId: current.session.id, status: ReservationStatus.PAYMENT_PENDING },
          select: { id: true, createdAt: true, expiresAt: true },
        });
        for (const r of pending) {
          const recalculated = paymentDeadline(fields.paymentHours, sessionData.date, r.createdAt);
          const later = recalculated > r.expiresAt ? recalculated : r.expiresAt;
          const next = later < sessionData.date ? later : sessionData.date;
          if (next.getTime() !== r.expiresAt.getTime()) {
            await tx.reservation.update({ where: { id: r.id }, data: { expiresAt: next } });
          }
        }
      }
    } else {
      await tx.showSession.create({ data: { ...sessionData, showId: id } });
    }
    await logAudit({ action: "SHOW_UPDATED", entityType: "Show", entityId: id, actorUserId }, tx);
  });
}

// 예매 기록이 하나라도 있으면 지우지 않는다(티켓·환불 기록이 공연에 매여 있다).
export async function deleteShow(id: string, actorUserId: string) {
  await prisma.$transaction(async (tx) => {
    await lockShowWrites(tx);
    const show = await tx.show.findUnique({ where: { id }, include: { sessions: { select: { id: true } } } });
    if (!show) throw new HttpError(404, "공연을 찾을 수 없어요.");
    const sessionIds = show.sessions.map((s) => s.id);
    // 세는 사이에 예매가 들어오지 않게 회차를 잠근다(들어오면 회차를 지울 때 DB 오류가 난다).
    for (const sessionId of sessionIds) await lockSession(tx, sessionId);
    const bookings = await tx.reservation.count({ where: { sessionId: { in: sessionIds } } });
    if (bookings > 0) {
      throw new HttpError(400, "예매 기록이 있는 공연은 지울 수 없어요. 상태를 '지난 공연'이나 '준비 중'으로 바꿔 주세요.");
    }
    await tx.showSession.deleteMany({ where: { showId: id } });
    await tx.show.delete({ where: { id } });
    await logAudit({ action: "SHOW_DELETED", entityType: "Show", entityId: id, actorUserId, before: { title: show.title } }, tx);
  });
}
