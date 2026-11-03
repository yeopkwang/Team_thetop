import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, SERVER_ERROR, errorResponse } from "@/lib/http";
import { confirmBooking } from "@/lib/admin-bookings";

// 여러 예매를 한 번에 입금 확인한다. 하나가 실패해도 나머지는 처리하고, 건마다 결과를 돌려준다.
// 연결이 하나뿐인 설정(connection_limit=1)이라 차례로 처리한다.
export async function POST(req: Request) {
  try {
    const actor = await requireRoleAtLeast(RoleType.STAFF);
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? Array.from(new Set(body.ids.map(String))) : [];
    if (ids.length === 0) throw new HttpError(400, "입금을 확인할 예매를 골라 주세요.");
    if (ids.length > 200) throw new HttpError(400, "한 번에 200건까지 확인할 수 있어요.");

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await confirmBooking(id, actor.user.id);
        results.push({ id, ok: true });
      } catch (error) {
        if (!(error instanceof HttpError)) console.error(error);
        results.push({ id, ok: false, error: error instanceof HttpError ? error.message : SERVER_ERROR });
      }
    }
    return NextResponse.json({ results });
  } catch (error) {
    return errorResponse(error);
  }
}
