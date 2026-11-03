export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { myDashboard } from "@/lib/bookings";
import { route } from "@/lib/http";

// 마이 티켓: 지금 공연의 내 예매·티켓·입금 안내.
export const GET = route(async () => {
  const session = await requireSession();
  return NextResponse.json(await myDashboard(session.user.id));
});
