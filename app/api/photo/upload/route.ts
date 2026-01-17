import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, HttpError } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { title, sessionId, urls } = body;
    if (!title) throw new HttpError(400, "제목 필요");
    const urlArr: string[] = Array.isArray(urls) ? urls : [];

    const post = await prisma.photoPost.create({
      data: {
        title,
        sessionId: sessionId || null,
        createdByUserId: session.user.id,
        assets: { create: urlArr.map((url: string) => ({ url })) },
      },
    });

    await logAudit({
      action: "PHOTO_POST_CREATED",
      entityType: "PhotoPost",
      entityId: post.id,
      actorUserId: session.user.id,
      after: { title },
    });

    return NextResponse.json({ post });
  } catch (err: any) {
    if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
