export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireSessionWithRoles, HttpError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const session = await requireSessionWithRoles();
    return NextResponse.json({ user: session.user });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
