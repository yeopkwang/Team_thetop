export const dynamic = "force-dynamic";
import type { Viewport } from "next";
import Link from "next/link";
import SalesStatus from "@/components/landing/SalesStatus";
import { kstDayKey } from "@/lib/format";
import { getCurrentShow, getPastShows, getSessionAvailability } from "@/lib/show";

export const viewport: Viewport = { themeColor: "#120809" };

const ORDINAL = ["첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

type Poster = { id: string; title: string; posterUrl: string | null; year: string };

function PosterCard({ poster, current, index }: { poster: Poster; current?: boolean; index: number }) {
  // 지난 포스터는 오래된 것부터 조금씩 커지고, 이번 공연 포스터가 가장 크게 선다.
  const width = current ? "calc(var(--u) * 28)" : `calc(var(--u) * ${5 + index})`;
  return (
    <figure className="anim-rise shrink-0" style={{ width, animationDelay: `${current ? 420 : index * 90}ms` }}>
      <div className="relative">
        {current && poster.posterUrl && (
          // 포스터 색을 그대로 번지게 해서 조명을 받는 것처럼
          <img src={poster.posterUrl} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full scale-110 opacity-70 blur-2xl" />
        )}
        {poster.posterUrl ? (
          <img
            src={poster.posterUrl}
            alt={`${poster.title} 포스터`}
            className={`aspect-[3/4] w-full rounded-[3px] object-cover ${
              current ? "shadow-[0_30px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/15" : "opacity-60 ring-1 ring-white/10"
            }`}
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-[3px] bg-white/5 font-display text-white/30 ring-1 ring-white/10">
            {current ? poster.title : ""}
          </div>
        )}
      </div>
      <figcaption className={`mt-2 text-center tabular-nums ${current ? "text-meta font-semibold text-white" : "text-[11px] text-white/45"}`}>
        {poster.year}
      </figcaption>
    </figure>
  );
}

// 첫 화면 "○번째 무대": 지난 포스터가 작은 것부터 차례로 서고, 그 끝에 이번 공연 포스터가 크게 선다.
// 버튼은 예매하기 / 공연 안내 두 개.
export default async function LandingPage() {
  const [current, pastDesc] = await Promise.all([getCurrentShow(), getPastShows()]);
  const sessions = current ? await getSessionAvailability(current) : [];

  const yearOf = (s: { sessions: { date: Date }[]; createdAt: Date }) =>
    kstDayKey(s.sessions[0]?.date ?? s.createdAt).slice(0, 4);
  const past: Poster[] = [...pastDesc]
    .reverse()
    .slice(-4)
    .map((s) => ({ id: s.id, title: s.title, posterUrl: s.posterUrl, year: yearOf(s) }));

  const all = [...pastDesc, ...(current ? [current] : [])];
  const count = all.length;
  const firstYear = all.length ? all.map(yearOf).sort()[0] : "";
  const ordinal = count >= 1 && count <= ORDINAL.length ? `${ORDINAL[count - 1]} 번째` : `${count}번째`;
  const when = current ? [current.dateLabel, current.timeLabel].filter(Boolean).join("  ") : "";

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#120809] text-white">
      {/* 이번 공연 포스터 쪽으로 쏟아지는 붉은 무대 조명 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(90%_55%_at_50%_22%,rgba(211,18,29,0.32),transparent_70%)] lg:bg-[radial-gradient(55%_70%_at_74%_45%,rgba(211,18,29,0.34),transparent_72%)]"
      />

      <div className="page flex min-h-dvh flex-col justify-end gap-9 pb-[calc(32px+env(safe-area-inset-bottom))] pt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:py-24">
        {/* 포스터 줄: 무대 바닥선 위에 선다 */}
        <div className="[--u:6px] sm:[--u:8px] lg:order-2 lg:[--u:9px]">
          <div className="flex items-end justify-center gap-2 border-b border-white/10 pb-0 sm:gap-3 lg:gap-3.5">
            {past.map((p, i) => (
              <PosterCard key={p.id} poster={p} index={i} />
            ))}
            {current && (
              <PosterCard
                poster={{ id: current.id, title: current.title, posterUrl: current.posterUrl, year: yearOf(current) }}
                current
                index={past.length}
              />
            )}
          </div>
        </div>

        <div className="lg:order-1">
          {count > 0 && (
            <p className="anim-rise text-ui text-white/60 [animation-delay:480ms]">
              {firstYear}년부터 이어 온 {ordinal} 무대
            </p>
          )}
          <h1 className="anim-rise mt-2 break-keep font-display text-[clamp(54px,15vw,100px)] leading-[0.98] tracking-[-0.02em] [animation-delay:540ms]">
            {current?.title || "작전명문"}
          </h1>

          {current ? (
            <div className="anim-rise mt-5 space-y-0.5 [animation-delay:600ms]">
              {when && <p className="text-lead font-semibold">{when}</p>}
              {current.venue && <p className="text-body text-white/65">{current.venue}</p>}
            </div>
          ) : (
            <p className="anim-rise mt-5 text-lead text-white/70 [animation-delay:600ms]">다음 무대를 준비하고 있어요.</p>
          )}

          <div className="anim-rise mt-8 grid gap-3 [animation-delay:680ms] sm:flex lg:mt-10">
            <Link
              href="/book"
              className="btn btn-lg bg-brand-600 text-white shadow-[0_14px_40px_rgba(211,18,29,0.45)] hover:bg-[#E5222C] sm:min-w-[190px]"
            >
              예매하기
            </Link>
            <Link
              href="/show"
              className="btn btn-lg border border-white/40 text-white hover:border-white hover:bg-white hover:text-ink sm:min-w-[190px]"
            >
              공연 안내
            </Link>
          </div>

          {current && sessions.length > 0 && (
            <div className="anim-rise mt-4 [animation-delay:740ms]">
              <SalesStatus
                salesOpenAt={current.salesOpenAt?.toISOString() ?? null}
                sessions={sessions.map((s) => ({ startsAt: s.date.toISOString(), remaining: s.remaining }))}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
