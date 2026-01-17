import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireSession } from "@/lib/auth-helpers";
import { RefundStatus, ReservationStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { bankName, accountNumber, holderName } = body;
    if (!bankName || !accountNumber || !holderName) throw new HttpError(400, "계좌 정보 필요");

    const refund = await prisma.refund.findUnique({
      where: { id: params.id },
      include: { reservation: true },
    });
    if (!refund) throw new HttpError(404, "환불 없음");
    if (refund.reservation.userId !== session.user.id) throw new HttpError(403, "권한 없음");

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.refundAccount.upsert({
        where: { refundId: refund.id },
        update: { bankName, accountNumber, holderName },
        create: { refundId: refund.id, bankName, accountNumber, holderName },
      });
      const updatedReservation = await tx.reservation.update({
        where: { id: refund.reservationId },
        data: { status: ReservationStatus.REFUND_PENDING },
      });
      await tx.refund.update({ where: { id: refund.id }, data: { status: RefundStatus.PENDING } });
      await logAudit({
        action: "REFUND_ACCOUNT_SUBMITTED",
        entityType: "Refund",
        entityId: refund.id,
        actorUserId: session.user.id,
        before: { status: refund.status },
        after: { status: RefundStatus.PENDING },
      });
      return { account, reservation: updatedReservation };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
