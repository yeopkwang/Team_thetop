"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { won } from "@/lib/format";
import { ChevronRightIcon } from "../icons";

export type CalendarSession = {
  id: string;
  title: string;
  dayKey: string; // 한국 시간 기준 2027-02-21
  time: string; // 18:00
  remaining: number;
  total: number;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function monthKey(dayKey: string) {
  return dayKey.slice(0, 7);
}

// 그 달의 칸: 앞쪽 빈칸(null) + 1일부터 말일까지
function monthCells(month: string) {
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
}

// PC 공연 안내 오른쪽의 예매 패널: 관람일 달력 → 회차 → 잔여석 → 예매하기.
export default function BookingCalendar({ sessions, price }: { sessions: CalendarSession[]; price: number }) {
  const months = useMemo(() => Array.from(new Set(sessions.map((s) => monthKey(s.dayKey)))).sort(), [sessions]);
  const firstOpen = sessions.find((s) => s.remaining > 0) || sessions[0];

  const [month, setMonth] = useState(firstOpen ? monthKey(firstOpen.dayKey) : months[0]);
  const [day, setDay] = useState(firstOpen?.dayKey || "");
  const [sessionId, setSessionId] = useState(firstOpen?.id || "");

  const playDays = useMemo(() => new Set(sessions.map((s) => s.dayKey)), [sessions]);
  const daySessions = sessions.filter((s) => s.dayKey === day);
  const selected = sessions.find((s) => s.id === sessionId) || null;
  const monthIndex = months.indexOf(month);

  const pickDay = (key: string) => {
    setDay(key);
    const first = sessions.find((s) => s.dayKey === key && s.remaining > 0) || sessions.find((s) => s.dayKey === key);
    setSessionId(first?.id || "");
  };

  if (!month) return null;
  const [y, m] = month.split("-");

  return (
    <div className="rounded-lg border border-line-strong bg-white">
      <section className="px-5 pb-4 pt-5">
        <h2 className="text-[15px] font-bold">관람일</h2>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="이전 달"
            disabled={monthIndex <= 0}
            onClick={() => setMonth(months[monthIndex - 1])}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-surface disabled:text-ink-4 disabled:hover:bg-transparent"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <p className="text-[15px] font-bold tabular-nums">
            {y}. {m}
          </p>
          <button
            type="button"
            aria-label="다음 달"
            disabled={monthIndex >= months.length - 1}
            onClick={() => setMonth(months[monthIndex + 1])}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-surface disabled:text-ink-4 disabled:hover:bg-transparent"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center text-cap">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`py-1.5 ${i === 0 ? "text-brand-600" : "text-ink-3"}`}>
              {w}
            </span>
          ))}
          {monthCells(month).map((key, i) => {
            if (!key) return <span key={`blank-${i}`} />;
            const playable = playDays.has(key);
            const chosen = key === day;
            const sunday = i % 7 === 0;
            return (
              <span key={key} className="flex items-center justify-center py-0.5">
                <button
                  type="button"
                  disabled={!playable}
                  onClick={() => pickDay(key)}
                  aria-pressed={chosen}
                  aria-label={`${Number(key.slice(5, 7))}월 ${Number(key.slice(8))}일${playable ? "" : " 공연 없음"}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-ui tabular-nums ${
                    chosen
                      ? "bg-brand-600 font-bold text-white"
                      : playable
                        ? "font-bold text-ink ring-1 ring-inset ring-brand-600 hover:bg-brand-50"
                        : sunday
                          ? "text-brand-200"
                          : "text-ink-4"
                  }`}
                >
                  {Number(key.slice(8))}
                </button>
              </span>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line px-5 py-4">
        <h2 className="text-[15px] font-bold">회차</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {daySessions.length === 0 && <p className="col-span-2 text-meta text-ink-3">관람일을 골라 주세요.</p>}
          {daySessions.map((s, i) => {
            const on = s.id === sessionId;
            const soldOut = s.remaining === 0;
            return (
              <button
                key={s.id}
                type="button"
                disabled={soldOut}
                onClick={() => setSessionId(s.id)}
                aria-pressed={on}
                className={`h-11 rounded-md border text-ui font-semibold ${
                  soldOut
                    ? "border-line bg-surface text-ink-4"
                    : on
                      ? "border-brand-600 text-brand-600"
                      : "border-line-strong text-ink hover:border-ink-3"
                }`}
              >
                {i + 1}회 {s.time}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line bg-surface px-5 py-4">
        <h2 className="text-meta font-semibold text-ink-2">잔여석</h2>
        {selected ? (
          <p className="mt-1.5 flex justify-between text-ui">
            <span>전석 {won(price)}</span>
            <span className={selected.remaining === 0 ? "font-semibold text-brand-600" : "font-semibold"}>
              {selected.remaining === 0 ? "매진" : `${selected.remaining}석`}
            </span>
          </p>
        ) : (
          <p className="mt-1.5 text-meta text-ink-3">회차를 고르면 잔여석이 보여요.</p>
        )}
      </section>

      <div className="p-5">
        {selected && selected.remaining > 0 ? (
          <Link href={`/book?session=${selected.id}`} className="btn-primary btn-lg w-full">
            예매하기
          </Link>
        ) : (
          <span className="btn btn-lg w-full cursor-not-allowed bg-ink-4 text-white">
            {selected ? "매진" : "예매하기"}
          </span>
        )}
        <p className="mt-3 text-center text-cap text-ink-3">1인 1매 예매 가능 | 무통장 입금</p>
      </div>
    </div>
  );
}
