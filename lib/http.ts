import { NextResponse } from "next/server";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 라우트 핸들러의 catch에서 쓴다. HttpError는 메시지를 그대로 내려주고, 나머지는 500으로 감춘다.
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
