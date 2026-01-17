import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function RecordPage() {
  const records = await prisma.recordPost.findMany({
    include: {
      session: {
        include: { show: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">RECORD</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {records.map((r) => (
          <Link
            key={r.id}
            href={`/record/${r.id}`}
            className="rounded-xl bg-white shadow p-4 space-y-2 hover:shadow-lg"
          >
            <div className="text-sm text-slate-500">{r.session?.show?.title}</div>
            <div className="font-semibold">{r.title}</div>
            <div className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleDateString()}</div>
          </Link>
        ))}
        {records.length === 0 && <div className="text-sm text-slate-500">등록된 기록이 없습니다.</div>}
      </div>
    </main>
  );
}
