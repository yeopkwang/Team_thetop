import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const refund = await prisma.refund.findUnique({ where: { id: params.id }, include: { account: true, reservation: true } });
    if (!refund) throw new HttpError(404, "환불 없음");
    return NextResponse.json({ refund });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
