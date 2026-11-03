export const dynamic = "force-dynamic";
import type { Viewport } from "next";
import Link from "next/link";
import { getCurrentShow } from "@/lib/show";

// 첫 화면은 진홍 배경이라 모바일 브라우저 윗부분도 같은 색으로 맞춘다.
export const viewport: Viewport = { themeColor: "#1F0306" };

// 첫 화면: 무대 조명 같은 진홍 배경, 포스터의 名門, 공연 제목, 버튼 두 개.
export default async function LandingPage() {
  const show = await getCurrentShow();
  const when = show ? [show.dateLabel, show.timeLabel].filter(Boolean).join("  ") : "";

  return (
    <main className="relative isolate flex min-h-dvh flex-col justify-end overflow-hidden bg-[#1F0306] text-white lg:justify-center">
      {/* 무대 위에서 비추는 조명 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(120%_75%_at_80%_-10%,#A3101C_0%,#5C0811_40%,#1F0306_80%)]"
      />

      {/* 포스터의 名門을 아래로 갈수록 사라지게 크게 깐다. 모바일은 세로쓰기로 오른쪽 위에 세운다. */}
      <span
        aria-hidden
        className="anim-glyph pointer-events-none absolute -right-[14vw] top-[6dvh] -z-10 select-none bg-gradient-to-b from-[rgba(255,84,92,0.30)] via-[rgba(255,84,92,0.10)] to-transparent bg-clip-text font-display text-[64vw] font-black leading-none text-transparent [writing-mode:vertical-rl] lg:-right-[4vw] lg:top-auto lg:bottom-[-6vw] lg:text-[34vw] lg:[writing-mode:horizontal-tb]"
      >
        名門
      </span>

      <div className="page grid gap-12 pb-[calc(36px+env(safe-area-inset-bottom))] pt-32 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-16 lg:py-28">
        <div>
          <h1 className="anim-rise break-keep font-display text-[clamp(58px,17vw,128px)] font-black leading-[0.98] tracking-[-0.05em] [text-wrap:balance]">
            {show?.title || "작전명문"}
          </h1>

          {show ? (
            <div className="anim-rise mt-6 space-y-1 [animation-delay:150ms] lg:mt-8">
              {when && <p className="text-lead font-semibold lg:text-h2">{when}</p>}
              {show.venue && <p className="text-body text-white/70 lg:text-lead">{show.venue}</p>}
            </div>
          ) : (
            <p className="anim-rise mt-6 text-lead text-white/75 [animation-delay:150ms]">다음 공연을 준비하고 있어요.</p>
          )}

          <div className="anim-rise mt-10 grid gap-3 [animation-delay:300ms] sm:flex lg:mt-12">
            <Link
              href="/book"
              className="btn btn-lg bg-brand-600 text-white shadow-[0_14px_40px_rgba(211,18,29,0.5)] hover:bg-[#E5222C] sm:min-w-[200px]"
            >
              예매하기
            </Link>
            <Link
              href="/show"
              className="btn btn-lg border border-white/45 text-white hover:border-white hover:bg-white hover:text-brand-800 sm:min-w-[200px]"
            >
              공연 안내
            </Link>
          </div>
        </div>

        {show?.posterUrl && (
          <div className="anim-rise hidden [animation-delay:200ms] lg:block">
            <img
              src={show.posterUrl}
              alt={`${show.title} 포스터`}
              className="w-full rounded-md shadow-[0_40px_90px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            />
          </div>
        )}
      </div>
    </main>
  );
}
