export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron";
import { HttpError, route } from "@/lib/http";
import { prisma } from "@/lib/prisma";

// Supabase 무료 플랜은 7일 동안 DB에 요청이 없으면 프로젝트를 일시정지한다.
// Vercel Cron이 하루 한 번(vercel.json의 crons) 이 주소를 불러 표 하나를 가볍게 읽어 둔다.
export const GET = route(async (req) => {
  if (!isCronRequest(req.headers.get("authorization"))) throw new HttpError(401, "권한이 없어요.");
  await prisma.show.count();
  return NextResponse.json({ ok: true });
});
