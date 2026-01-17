import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const shows = await prisma.show.findMany({
    where: { isActive: true },
    include: { sessions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    shows: shows.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      sessions: s.sessions,
    })),
  });
}
