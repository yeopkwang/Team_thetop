import { NextResponse } from "next/server";

async function notEnabled() {
  return NextResponse.json({ error: "NextAuth is disabled in JWT mode." }, { status: 410 });
}

export const GET = notEnabled;
export const POST = notEnabled;
export const auth = async () => null;
