import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(date?: Date | null) {
  if (!date) return "일정 미정";
  return new Intl.DateTimeFormat("ko", { month: "short", day: "numeric" }).format(date);
}

export default async function HomePage() {
  const shows = await prisma.show.findMany({
    include: { sessions: true },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });
  const now = new Date();
  const upcoming = shows.filter((s) => s.isActive || (!!s.startDate && s.startDate > now));
  const past = shows.filter((s) => !s.isActive || (!!s.startDate && s.startDate <= now));

  return (
    <main className="container-base space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-6 md:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-200">작전명문</p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">공연 예매 · 예약 허브</h1>
            <p className="text-sm text-slate-200">
              홈에서 지난 공연을 둘러보고, 예매·예약에서 다음 공연을 신청하세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/book"
              className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              예매·예약 바로가기
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">예정 공연</h2>
          <Link href="/book" className="text-sm text-blue-600 hover:text-blue-700">
            예약하러 가기
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.length === 0 && (
            <div className="rounded-xl bg-white shadow p-4 text-sm text-slate-500">등록된 예정 공연이 없습니다.</div>
          )}
          {upcoming.map((show) => (
            <div key={show.id} className="rounded-xl bg-white shadow hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-1">예정</span>
                <span className="text-sm text-slate-500">{formatDate(show.startDate)}</span>
              </div>
              <div className="text-lg font-semibold">{show.title}</div>
              <p className="text-sm text-slate-600">{show.description}</p>
              <div className="flex flex-wrap gap-2">
                {show.sessions.map((s) => (
                  <span key={s.id} className="rounded-full border px-3 py-1 text-xs text-slate-700">
                    {s.title} · {new Date(s.date).toLocaleDateString("ko", { month: "short", day: "numeric" })}
                  </span>
                ))}
              </div>
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                예약/예매하기
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">지난 공연</h2>
          <p className="text-sm text-slate-500">관리자가 게시한 기록</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {past.length === 0 && (
            <div className="rounded-xl bg-white shadow p-4 text-sm text-slate-500">지난 공연 기록이 없습니다.</div>
          )}
          {past.map((show) => (
            <div key={show.id} className="rounded-xl bg-white shadow hover:shadow-lg transition p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1">지난 공연</span>
                <span>{formatDate(show.startDate)}</span>
              </div>
              <div className="font-semibold">{show.title}</div>
              <p className="text-sm text-slate-600">{show.description || "관리자가 등록한 공연 기록"}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
