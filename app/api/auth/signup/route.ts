import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "일반 회원가입은 카카오 로그인으로만 지원합니다." },
    { status: 410 }
  );
}
