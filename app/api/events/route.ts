import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

export async function GET() {
  const sessions = await prisma.showSession.findMany({
    include: { show: true },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    sessions.map((session) => ({
      id: session.id,
      title: session.title,
      startAt: session.date,
      totalStock: session.totalCapacity,
      remainingStock: Math.max(0, session.totalCapacity - session.soldQty),
      showPost: {
        id: session.show.id,
        title: CURRENT_SHOW_INFO.title,
        content: CURRENT_SHOW_INFO.notice,
      },
    }))
  );
}
