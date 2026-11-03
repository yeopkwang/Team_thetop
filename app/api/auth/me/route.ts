export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-helpers";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const session = await requireSession();
  return NextResponse.json({ user: session.user });
});
