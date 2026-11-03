export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getCurrentShow, getSessionAvailability } from "@/lib/show";
import { errorResponse } from "@/lib/http";

// 지금 예매 중인 공연의 회차와 잔여석.
export async function GET() {
  try {
    const show = await getCurrentShow();
    if (!show) return NextResponse.json([]);

    const sessions = await getSessionAvailability(show);
    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        title: s.title,
        startAt: s.date,
        totalStock: s.total,
        remainingStock: s.remaining,
      }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}
