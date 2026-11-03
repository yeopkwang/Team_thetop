import Link from "next/link";
import { formatSessionDate, won } from "@/lib/format";
import type { SessionAvailability } from "@/lib/show";

function SeatCount({ remaining, total }: { remaining: number; total: number }) {
  const low = remaining > 0 && remaining <= Math.max(5, Math.round(total * 0.1));
  return (
    <p className="mt-2 flex items-baseline justify-between text-meta">
      <span className={low || remaining === 0 ? "font-semibold text-brand-600" : "text-ink-2"}>
        {remaining === 0 ? "매진" : `남은 좌석 ${remaining}석`}
      </span>
      <span className="text-ink-3">전체 {total}석</span>
    </p>
  );
}

// PC 오른쪽에 따라 내려오는 예매 패널.
export default function BookingPanel({ sessions, price }: { sessions: SessionAvailability[]; price: number }) {
  const soldOut = sessions.every((s) => s.remaining === 0);

  return (
    <div className="rounded-lg border border-line bg-white">
      <h2 className="border-b border-line px-5 py-4 text-lead font-bold">예매</h2>

      <div className="space-y-5 px-5 py-5">
        {sessions.map((s) => (
          <div key={s.id}>
            <p className="text-[15px] font-semibold text-ink">{formatSessionDate(s.date)}</p>
            <p className="text-meta text-ink-3">{s.title}</p>
            <SeatCount remaining={s.remaining} total={s.total} />
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-ui text-ink-2">관람료</span>
          <span className="text-lead font-bold">{won(price)}</span>
        </div>
      </div>

      <div className="px-5 pb-5">
        {soldOut ? (
          <span className="btn btn-lg w-full bg-ink-4 text-white">매진</span>
        ) : (
          <Link href="/book" className="btn-primary btn-lg w-full">
            예매하기
          </Link>
        )}
        <p className="mt-3 text-center text-cap text-ink-3">1인 1매, 무통장 입금으로 예매해요.</p>
      </div>
    </div>
  );
}

// 모바일 하단 고정 예매 바.
export function MobileBookingBar({ sessions, price }: { sessions: SessionAvailability[]; price: number }) {
  const remaining = sessions.reduce((sum, s) => sum + s.remaining, 0);

  return (
    <div className="bottom-bar lg:hidden">
      <div className="page flex items-center gap-4 py-3">
        <div className="shrink-0">
          <p className={`text-cap ${remaining === 0 ? "font-semibold text-brand-600" : "text-ink-3"}`}>
            {remaining === 0 ? "매진" : `남은 좌석 ${remaining}석`}
          </p>
          <p className="text-lead font-bold">{won(price)}</p>
        </div>
        {remaining === 0 ? (
          <span className="btn btn-lg flex-1 bg-ink-4 text-white">매진</span>
        ) : (
          <Link href="/book" className="btn-primary btn-lg flex-1">
            예매하기
          </Link>
        )}
      </div>
    </div>
  );
}
