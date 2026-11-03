"use client";

import Link from "next/link";
import { formatSessionDate } from "@/lib/format";
import { salesState, untilText } from "@/lib/sales";
import { useSalesClock } from "../useSalesClock";

// 모바일 하단 고정 예매 버튼. 회차는 예매 화면에서 고른다.
export default function MobileBookingBar({
  salesOpenAt,
  sessions,
}: {
  salesOpenAt: string | null;
  sessions: { startsAt: string; remaining: number }[];
}) {
  const { now } = useSalesClock(salesOpenAt);
  const state = salesState(salesOpenAt, sessions, now);

  return (
    <div className="bottom-bar lg:hidden">
      <div className="page py-2.5">
        {state === "open" ? (
          <Link href="/book" className="btn-primary btn-lg w-full">
            예매하기
          </Link>
        ) : state === "upcoming" && salesOpenAt ? (
          <span className="btn btn-lg w-full cursor-not-allowed flex-col gap-0 bg-ink text-white">
            <span className="text-cap font-medium text-white/70">티켓 오픈 {formatSessionDate(salesOpenAt)}</span>
            <span className="text-[16px] tabular-nums">{untilText(salesOpenAt, now)}</span>
          </span>
        ) : (
          <span className="btn btn-lg w-full cursor-not-allowed bg-ink-4 text-white">{state === "closed" ? "예매 종료" : "매진"}</span>
        )}
      </div>
    </div>
  );
}
