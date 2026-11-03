import type { Show } from "@prisma/client";
import { won } from "@/lib/format";
import Poster from "./Poster";

type Fields = Pick<Show, "title" | "posterUrl" | "timeLabel" | "timeSubLabel" | "venue" | "audienceInfo" | "price">;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-[72px] shrink-0 text-ui text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ui text-ink">{children}</dd>
    </div>
  );
}

// 공연 안내 위쪽: 장르 표시와 제목, (PC에서) 포스터, 기본 정보.
export default function ShowSummary({
  show,
  period,
  badge = "콘서트",
}: {
  show: Fields;
  period: string;
  badge?: string;
}) {
  return (
    <section className="pt-6 lg:pt-0">
      <span className="inline-block rounded-sm border border-line-strong px-1.5 py-px text-cap text-ink-2">{badge}</span>
      <h1 className="mt-2 text-h2 font-bold text-ink lg:text-h1">{show.title}</h1>

      <div className="mt-5 border-t border-ink pt-5 lg:mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:pt-6">
        <div className="hidden lg:block">
          <Poster src={show.posterUrl} title={show.title} />
        </div>

        <dl>
          {show.venue && <Row label="장소">{show.venue}</Row>}
          {period && <Row label="공연기간">{period}</Row>}
          {show.timeLabel && (
            <Row label="공연시간">
              {show.timeLabel}
              {show.timeSubLabel && <span className="ml-1 text-ink-3">({show.timeSubLabel})</span>}
            </Row>
          )}
          {show.audienceInfo && <Row label="관람 안내">{show.audienceInfo}</Row>}
          {show.price > 0 && (
            <Row label="가격">
              <span className="font-semibold">전석 {won(show.price)}</span>
            </Row>
          )}
        </dl>
      </div>
    </section>
  );
}
