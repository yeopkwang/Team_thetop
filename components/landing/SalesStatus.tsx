"use client";

import { formatSessionDate } from "@/lib/format";
import { salesState, untilText } from "@/lib/sales";
import { useSalesClock } from "../useSalesClock";

// 첫 화면 버튼 아래 한 줄: 남은 좌석, 티켓 오픈까지 남은 시간, 매진, 예매 종료.
export default function SalesStatus({
  salesOpenAt,
  sessions,
}: {
  salesOpenAt: string | null;
  sessions: { startsAt: string; remaining: number }[];
}) {
  const { now } = useSalesClock(salesOpenAt);
  const state = salesState(salesOpenAt, sessions, now);
  const remaining = sessions.reduce((sum, s) => sum + s.remaining, 0);

  const text =
    state === "upcoming" && salesOpenAt
      ? `티켓 오픈 ${formatSessionDate(salesOpenAt)}, ${untilText(salesOpenAt, now)}`
      : state === "soldout"
        ? "매진됐어요"
        : state === "closed"
          ? "예매가 끝났어요"
          : `남은 좌석 ${remaining}석`;

  return (
    <p className="text-meta tabular-nums text-white/60" aria-live="polite">
      {state === "open" && <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-brand-600 align-middle" />}
      {text}
    </p>
  );
}
