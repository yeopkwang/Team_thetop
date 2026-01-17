import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast, requireSession } from "@/lib/auth-helpers";
import { RoleRequestStatus, RoleType } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const requests = await prisma.roleRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        userId: r.userId,
        userName: r.user.name || r.user.nickname,
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireSession();
    const existing = await prisma.roleRequest.findFirst({ where: { userId: session.user.id, status: RoleRequestStatus.PENDING } });
    if (existing) throw new HttpError(400, "이미 요청됨");

    const request = await prisma.roleRequest.create({ data: { userId: session.user.id, status: RoleRequestStatus.PENDING } });
    await logAudit({ action: "ROLE_REQUEST_CREATED", entityType: "RoleRequest", entityId: request.id, actorUserId: session.user.id, after: { status: request.status } });
    return NextResponse.json({ request });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRoleAtLeast(RoleType.SUPER_ADMIN);
    const body = await req.json();
    const { requestId, decision } = body;
    if (!requestId || !decision) throw new HttpError(400, "잘못된 요청");

    const roleRequest = await prisma.roleRequest.findUnique({ where: { id: requestId } });
    if (!roleRequest) throw new HttpError(404, "요청 없음");

    const updated = await prisma.$transaction(async (tx) => {
      const status = decision === "APPROVE" ? RoleRequestStatus.APPROVED : RoleRequestStatus.REJECTED;
      const saved = await tx.roleRequest.update({
        where: { id: roleRequest.id },
        data: { status, handledAt: new Date(), handledByUserId: session.user.id },
      });

      if (status === RoleRequestStatus.APPROVED) {
        const adminRole = await tx.role.findUnique({ where: { type: RoleType.ADMIN } });
        if (!adminRole) throw new HttpError(500, "ADMIN role missing");
        const adminCount = await tx.userRole.count({
          where: {
            roleId: adminRole.id,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });
        if (adminCount >= 2) throw new HttpError(400, "ADMIN 제한 2명");
        await tx.userRole.upsert({
          where: { userId_roleId_isActive: { userId: roleRequest.userId, roleId: adminRole.id, isActive: true } },
          update: {},
          create: { userId: roleRequest.userId, roleId: adminRole.id },
        });
      }

      await logAudit({
        action: "ROLE_REQUEST_DECIDED",
        entityType: "RoleRequest",
        entityId: roleRequest.id,
        actorUserId: session.user.id,
        before: { status: roleRequest.status },
        after: { status },
      });

      return saved;
    });

    return NextResponse.json({ request: updated });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
