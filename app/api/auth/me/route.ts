export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireSessionWithRoles } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireSessionWithRoles();
    return NextResponse.json({ user: session.user });
  } catch (error) {
    return errorResponse(error);
  }
}
