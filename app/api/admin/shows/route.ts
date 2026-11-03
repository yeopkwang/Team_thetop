export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { createShow, listShows, showInput } from "@/lib/admin-shows";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { readBody, route } from "@/lib/http";

export const GET = route(async () => {
  await requireRoleAtLeast(RoleType.ADMIN);
  return NextResponse.json({ shows: await listShows() });
});

export const POST = route(async (req) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  const id = await createShow(await readBody(req, showInput), actor.user.id);
  return NextResponse.json({ id });
});
