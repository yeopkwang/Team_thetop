import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { RoleType } from "@prisma/client";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const refunds = await prisma.refund.findMany({
      include: { reservation: true, account: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ refunds });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
