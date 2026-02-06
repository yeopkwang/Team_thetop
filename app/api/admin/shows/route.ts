import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const shows = await prisma.show.findMany({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ shows });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, description, startDate, endDate, isActive } = body;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const show = await prisma.show.create({
    data: {
      title,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: !!isActive,
    },
  });
  return NextResponse.json({ show });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, isActive } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const show = await prisma.show.update({
    where: { id },
    data: { isActive: !!isActive },
  });
  return NextResponse.json({ show });
}
