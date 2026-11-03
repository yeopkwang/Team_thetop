import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { cancelBookingByStaff } from "@/lib/admin-bookings";

// 운영진이 입금하지 않은 예매를 취소한다. 사유는 관객에게 보인다.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRoleAtLeast(RoleType.STAFF);
    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim();
    if (!reason) throw new HttpError(400, "취소 사유를 적어 주세요. 관객의 마이 티켓에 보여요.");
    if (reason.length > 100) throw new HttpError(400, "취소 사유는 100자 안으로 적어 주세요.");

    await cancelBookingByStaff(params.id, reason, actor.user.id);
    return NextResponse.json({ reservation: { id: params.id, status: "CANCELLED" } });
  } catch (error) {
    return errorResponse(error);
  }
}
