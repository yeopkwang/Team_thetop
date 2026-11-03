import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { cancelOwnBooking } from "@/lib/bookings";
import { route } from "@/lib/http";

// 관객이 입금 전에 직접 취소한다.
export const POST = route<{ params: { id: string } }>(async (_req, { params }) => {
  const session = await requireSession();
  await cancelOwnBooking(session.user.id, params.id);
  return NextResponse.json({ booking: { id: params.id, status: "CANCELLED" } });
});
