import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { z, ZodTypeAny } from "zod";

// 사용자에게 그대로 보여 줄 오류. 라우트에서 던지면 route()가 이 상태 코드와 문구로 응답한다.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const SERVER_ERROR = "일시적인 문제로 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
export const BUSY_ERROR = "지금 요청이 몰려 있어요. 잠시 뒤 다시 눌러 주세요.";

// DB 연결이나 트랜잭션 차례를 기다리다 시간이 다 된 경우(티켓 오픈 직후 몰릴 때). 고장이 아니라 붐비는 것이다.
const BUSY_CODES = new Set(["P2024", "P2028", "P2034"]);

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && BUSY_CODES.has(error.code)) {
    console.warn("busy", error.code);
    return NextResponse.json({ error: BUSY_ERROR }, { status: 503 });
  }
  console.error(error);
  return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
}

// 모든 API 라우트의 껍데기. HttpError는 그 상태 코드로, 나머지 오류는 내용을 감추고 500으로 바꾼다.
export function route<Ctx = { params: Record<string, string> }>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// 요청 본문(JSON)을 읽고 모양을 확인한다. JSON이 아니거나 모양이 틀리면 첫 번째 문제를 문구로 400을 낸다.
export async function readBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "요청 내용을 읽지 못했어요.");
  }
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || "입력값을 확인해 주세요.");
  return parsed.data;
}

// 요청을 보낸 곳의 IP. Vercel은 x-forwarded-for를 실제 접속 주소로 덮어써서 관객이 꾸며 보낼 수 없다.
// 로컬(next start)처럼 머리말이 없으면 "unknown" 하나로 묶는다.
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}
