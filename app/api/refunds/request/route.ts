import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { requestRefund } from "@/lib/bookings";
import { readBody, route } from "@/lib/http";
import { refundInput } from "@/lib/inputs";

// 예매 완료된 티켓의 환불을 요청한다.
export const POST = route(async (req) => {
  const session = await requireSession();
  const { reservationId } = await readBody(req, refundInput);
  const refund = await requestRefund(session.user.id, reservationId);
  return NextResponse.json({ refund: { id: refund.id, status: refund.status } });
});
