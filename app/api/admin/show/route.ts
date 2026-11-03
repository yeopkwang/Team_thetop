export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { SEAT_HOLDING_STATUSES } from "@/lib/reservations";
import { logAudit } from "@/lib/audit";

const text = z.string().trim().max(10000).default("");

const showInput = z.object({
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
  isActive: z.boolean(),
  session: z.object({
    title: z.string().trim().min(1).max(100).default("1회차"),
    date: z.string().datetime({ message: "공연 일시가 올바르지 않습니다." }),
    totalCapacity: z.coerce.number().int().min(1, "정원은 1명 이상이어야 합니다."),
  }),
});

// 관리자가 고치는 공연: 판매 여부와 상관없이 가장 최근에 만든 공연과 그 첫 회차.
async function loadAdminShow() {
  const show = await prisma.show.findFirst({
    orderBy: { createdAt: "desc" },
    include: { sessions: { orderBy: { date: "asc" }, take: 1 } },
  });
  if (!show) return null;

  const { sessions, ...fields } = show;
  const session = sessions[0] || null;
  const reserved = session
    ? await prisma.reservation.aggregate({
        where: { sessionId: session.id, status: { in: SEAT_HOLDING_STATUSES } },
        _sum: { qty: true },
      })
    : null;

  return { ...fields, session, reservedQty: reserved?._sum.qty || 0 };
}

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    return NextResponse.json({ show: await loadAdminShow() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRoleAtLeast(RoleType.ADMIN);
    const parsed = showInput.safeParse(await req.json());
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || "입력값을 확인해 주세요.");
    const { session: sessionInput, ...fields } = parsed.data;

    const current = await loadAdminShow();
    const sessionData = {
      title: sessionInput.title,
      date: new Date(sessionInput.date),
      totalCapacity: sessionInput.totalCapacity,
    };

    await prisma.$transaction(async (tx) => {
      if (!current) {
        const created = await tx.show.create({ data: { ...fields, sessions: { create: sessionData } } });
        await logAudit({ action: "SHOW_CREATED", entityType: "Show", entityId: created.id, actorUserId: actor.user.id }, tx);
        return;
      }

      await tx.show.update({ where: { id: current.id }, data: fields });
      if (current.session) {
        // 예매 API와 같은 행을 잠그고 세야, 세는 사이에 들어온 예매까지 반영된다.
        await tx.$queryRaw`SELECT id FROM "ShowSession" WHERE id = ${current.session.id} FOR UPDATE`;
        const reserved = await tx.reservation.aggregate({
          where: { sessionId: current.session.id, status: { in: SEAT_HOLDING_STATUSES } },
          _sum: { qty: true },
        });
        const reservedQty = reserved._sum.qty || 0;
        if (sessionInput.totalCapacity < reservedQty) {
          throw new HttpError(400, `이미 ${reservedQty}명이 예매해서 정원을 그보다 줄일 수 없습니다.`);
        }
        await tx.showSession.update({ where: { id: current.session.id }, data: sessionData });
      } else {
        await tx.showSession.create({ data: { ...sessionData, showId: current.id } });
      }
      await logAudit({ action: "SHOW_UPDATED", entityType: "Show", entityId: current.id, actorUserId: actor.user.id }, tx);
    });

    return NextResponse.json({ show: await loadAdminShow() });
  } catch (error) {
    return errorResponse(error);
  }
}
