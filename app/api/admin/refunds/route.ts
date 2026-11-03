export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const refunds = await prisma.refund.findMany({
      include: {
        reservation: {
          select: {
            userId: true,
            status: true,
            qty: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ refunds });
  } catch (error) {
    return errorResponse(error);
  }
}
