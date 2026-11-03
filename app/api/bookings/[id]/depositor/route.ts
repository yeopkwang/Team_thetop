import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { changeDepositor } from "@/lib/bookings";
import { readBody, route } from "@/lib/http";
import { depositorInput } from "@/lib/inputs";

// 입금 대기 중에 입금자명을 고친다.
export const POST = route<{ params: { id: string } }>(async (req, { params }) => {
  const session = await requireSession();
  const { depositorName } = await readBody(req, depositorInput);
  await changeDepositor(session.user.id, params.id, depositorName);
  return NextResponse.json({ booking: { id: params.id, depositorName } });
});
