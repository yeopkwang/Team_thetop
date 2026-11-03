import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, requireRoleAtLeast } from "@/lib/auth-helpers";
import { RoleType, TicketTemplateScope } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRoleAtLeast(RoleType.ADMIN);
    const templates = await prisma.ticketTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ templates });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRoleAtLeast(RoleType.ADMIN);
    const body = await req.json();
    const { scope, imageUrl, showId, sessionId } = body;
    if (!scope || !imageUrl) throw new HttpError(400, "필수값 누락");
    const scopeEnum = scope as TicketTemplateScope;

    const template = await prisma.ticketTemplate.create({
      data: { scope: scopeEnum, imageUrl, showId: showId || null, sessionId: sessionId || null },
    });
    await logAudit({
      action: "TEMPLATE_CREATED",
      entityType: "TicketTemplate",
      entityId: template.id,
      actorUserId: session.user.id,
      after: { scope: template.scope },
    });

    return NextResponse.json({ template });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
