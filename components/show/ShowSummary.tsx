import type { Show } from "@prisma/client";
import { won } from "@/lib/format";
import Poster from "./Poster";

type Fields = Pick<
  Show,
  | "title"
  | "posterUrl"
  | "dateLabel"
  | "timeLabel"
  | "timeSubLabel"
  | "venue"
  | "venueAddress"
  | "contactName"
  | "contactTag"
  | "audienceInfo"
  | "notice"
  | "price"
>;

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[76px_1fr] gap-3 py-3 lg:grid-cols-[96px_1fr]">
      <dt className="text-ui text-ink-3">{label}</dt>
      <dd className="text-ui text-ink">
        {value}
        {sub && <span className="mt-0.5 block text-meta text-ink-3">{sub}</span>}
      </dd>
    </div>
  );
}

// 공연 제목, (PC에서) 포스터, 기본 정보 표.
export default function ShowSummary({ show }: { show: Fields }) {
  return (
    <section className="pt-6 lg:pt-0">
      <h1 className="text-h1 font-bold text-ink lg:text-hero">{show.title}</h1>

      <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <div className="hidden lg:block">
          <Poster src={show.posterUrl} title={show.title} />
        </div>

        <div>
          <dl className="divide-y divide-line border-y border-line">
            <Row label="장소" value={show.venue} sub={show.venueAddress} />
            <Row label="공연일" value={show.dateLabel} />
            <Row label="공연시간" value={show.timeLabel} sub={show.timeSubLabel} />
            <Row label="관람 안내" value={show.audienceInfo} />
            <Row label="가격" value={show.price > 0 ? `전석 ${won(show.price)}` : ""} />
            <Row label="문의" value={show.contactName || show.contactTag} sub={show.contactName ? show.contactTag : ""} />
          </dl>
          {show.notice && <p className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">{show.notice}</p>}
        </div>
      </div>
    </section>
  );
}
