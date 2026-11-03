export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";
import { createShow, listShows, parseShowInput } from "@/lib/admin-shows";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    return NextResponse.json({ shows: await listShows() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRoleAtLeast(RoleType.ADMIN);
    const id = await createShow(parseShowInput(await req.json()), actor.user.id);
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error);
  }
}
