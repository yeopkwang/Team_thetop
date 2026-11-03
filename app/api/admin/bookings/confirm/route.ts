import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { confirmBooking } from "@/lib/admin-bookings";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, SERVER_ERROR, readBody, route } from "@/lib/http";
import { batchConfirmInput } from "@/lib/inputs";

// 여러 예매를 한 번에 입금 확인한다. 하나가 실패해도 나머지는 처리하고, 건마다 결과를 돌려준다.
// 연결이 하나뿐인 설정(connection_limit=1)이라 차례로 처리한다.
export const POST = route(async (req) => {
  const actor = await requireRoleAtLeast(RoleType.STAFF);
  const { ids } = await readBody(req, batchConfirmInput);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of Array.from(new Set(ids))) {
    try {
      await confirmBooking(id, actor.user.id);
      results.push({ id, ok: true });
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error);
      results.push({ id, ok: false, error: error instanceof HttpError ? error.message : SERVER_ERROR });
    }
  }
  return NextResponse.json({ results });
});
