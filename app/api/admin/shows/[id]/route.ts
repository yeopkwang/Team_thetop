export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { deleteShow, loadShow, showInput, updateShow } from "@/lib/admin-shows";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, readBody, route } from "@/lib/http";

type Ctx = { params: { id: string } };

export const GET = route<Ctx>(async (_req, { params }) => {
  await requireRoleAtLeast(RoleType.ADMIN);
  const show = await loadShow(params.id);
  if (!show) throw new HttpError(404, "공연을 찾을 수 없어요.");
  return NextResponse.json({ show });
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  await updateShow(params.id, await readBody(req, showInput), actor.user.id);
  return NextResponse.json({ show: await loadShow(params.id) });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const actor = await requireRoleAtLeast(RoleType.ADMIN);
  await deleteShow(params.id, actor.user.id);
  return NextResponse.json({ ok: true });
});
