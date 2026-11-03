import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const SERVER_ERROR = "일시적인 문제로 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

// 라우트 핸들러의 catch에서 쓴다. HttpError는 메시지를 그대로 내려주고, 나머지는 500으로 감춘다.
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
}
