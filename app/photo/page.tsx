import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PhotoPage() {
  const posts = await prisma.photoPost.findMany({
    include: { assets: true, session: { include: { show: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="container-base space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PHOTO</h1>
        <Link href="/photo/upload" className="text-sm text-blue-600">
          업로드
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl bg-white shadow overflow-hidden">
            {p.assets[0] ? (
              <div className="h-48 bg-slate-100 flex items-center justify-center">
                <img src={p.assets[0].url} alt={p.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-48 bg-slate-100" />
            )}
            <div className="p-4 space-y-1">
              <div className="text-sm text-slate-500">{p.session?.show?.title}</div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-slate-500">
                {p.assets.length}장 · {new Date(p.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-sm text-slate-500">사진이 없습니다.</div>}
      </div>
    </main>
  );
}
