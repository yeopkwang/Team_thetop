import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function RecordDetail({ params }: { params: { id: string } }) {
  const record = await prisma.recordPost.findUnique({
    where: { id: params.id },
    include: { session: { include: { show: true } } },
  });

  if (!record) return notFound();

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">{record.title}</h1>
      <div className="text-sm text-slate-500">{record.session?.show?.title}</div>
      <div className="rounded bg-white shadow p-4 space-y-2">
        <div>
          <div className="font-semibold">참여 인원</div>
          <div className="text-sm text-slate-600 whitespace-pre-line">{record.participants}</div>
        </div>
        <div>
          <div className="font-semibold">참여 곡</div>
          <div className="text-sm text-slate-600 whitespace-pre-line">{record.setlist}</div>
        </div>
        <p className="text-sm whitespace-pre-line">{record.content}</p>
      </div>
    </main>
  );
}
