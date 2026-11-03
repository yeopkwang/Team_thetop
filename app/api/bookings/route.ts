import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { createBooking } from "@/lib/bookings";
import { readBody, route } from "@/lib/http";
import { bookingInput } from "@/lib/inputs";

// 예매하기(1인 1매, 입금 대기로 만든다).
export const POST = route(async (req) => {
  const session = await requireSession();
  const { sessionId, preferredPerformerName, depositorName } = await readBody(req, bookingInput);
  const booking = await createBooking(session.user.id, { sessionId, preferredPerformerName, depositorName });
  return NextResponse.json({ booking: { id: booking.id, status: booking.status, expiresAt: booking.expiresAt } });
});
