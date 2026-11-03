export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { deleteShow, loadShow, parseShowInput, updateShow } from "@/lib/admin-shows";

type Ctx = { params: { id: string } };

export async function GET(_: Request, { params }: Ctx) {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const show = await loadShow(params.id);
    if (!show) throw new HttpError(404, "공연을 찾을 수 없어요.");
    return NextResponse.json({ show });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const actor = await requireRoleAtLeast(RoleType.ADMIN);
    await updateShow(params.id, parseShowInput(await req.json()), actor.user.id);
    return NextResponse.json({ show: await loadShow(params.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const actor = await requireRoleAtLeast(RoleType.ADMIN);
    await deleteShow(params.id, actor.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
