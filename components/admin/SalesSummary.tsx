"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDownload, apiFetch, errorMessage, readAdminCache, writeAdminCache } from "@/lib/api-client";
import { formatSessionDate, won } from "@/lib/format";

type Summary = {
  show: { id: string; title: string; startsAt: string | null; salesOpenAt: string | null };
  capacity: number;
  remaining: number;
  confirmed: number;
  pending: number;
  refundPending: number;
  refunded: number;
  checkedIn: number;
  received: number;
};

// 관리자 첫 화면 맨 위: 판매 중인 공연의 좌석·입금·입장 현황과 명단 바로가기.
export default function SalesSummary() {
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const cached = readAdminCache<Summary | null>("summary");
    if (cached !== null) setSummary(cached);
    apiFetch<{ summary: Summary | null }>("/admin/summary")
      .then((data) => {
        setSummary(data.summary);
        writeAdminCache("summary", data.summary);
      })
      .catch((error: unknown) => setMessage(errorMessage(error, "판매 현황을 불러오지 못했어요.")));
  }, []);

  const download = async () => {
    setMessage("");
    try {
      await apiDownload("/admin/attendees?format=csv", "예매자 명단.csv");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "명단을 내려받지 못했어요."));
    }
  };

  if (summary === undefined) {
    return message ? <p className="rounded-md bg-surface px-4 py-3 text-meta text-ink-2">{message}</p> : <div className="bone h-[132px] w-full" />;
  }
  if (summary === null) {
    return (
      <p className="rounded-lg border border-line px-5 py-4 text-ui text-ink-2">
        지금 판매 중인 공연이 없어요.{" "}
        <Link href="/admin/shows" className="font-semibold text-ink underline underline-offset-2">
          공연 관리
        </Link>
        에서 공연을 &apos;판매 중&apos;으로 바꾸면 예매가 열려요.
      </p>
    );
  }

  const held = summary.confirmed + summary.pending;
  const percent = (n: number) => (summary.capacity ? Math.min(100, (n / summary.capacity) * 100) : 0);
  const stats: [string, string, string?][] = [
    ["예매 완료", `${summary.confirmed}명`],
    ["입금 대기", `${summary.pending}명`, summary.pending > 0 ? "text-wait-700" : undefined],
    ["남은 좌석", `${summary.remaining}석`],
    ["입장", `${summary.checkedIn} / ${summary.confirmed}명`],
    ["환불 대기", `${summary.refundPending}명`, summary.refundPending > 0 ? "text-brand-600" : undefined],
    ["받은 금액", won(summary.received)],
  ];

  return (
    <section aria-labelledby="summary-title" className="rounded-lg border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <h2 id="summary-title" className="text-[15px] font-bold">
          {summary.show.title} 판매 현황
        </h2>
        <p className="text-meta text-ink-3">
          {summary.show.startsAt ? `공연 ${formatSessionDate(summary.show.startsAt)}` : "공연 일시 미정"}
          {summary.show.salesOpenAt && new Date(summary.show.salesOpenAt) > new Date() && `, 티켓 오픈 ${formatSessionDate(summary.show.salesOpenAt)}`}
        </p>
      </div>

      <div className="px-5 pt-4">
        {/* 정원 막대: 예매 완료(진한 색) + 입금 대기(옅은 색) */}
        <div className="flex h-2 overflow-hidden rounded-full bg-surface" aria-hidden>
          <span className="bg-brand-600" style={{ width: `${percent(summary.confirmed)}%` }} />
          <span className="bg-brand-200" style={{ width: `${percent(summary.pending)}%` }} />
        </div>
        <p className="mt-1.5 text-cap text-ink-3">
          정원 {summary.capacity}석 중 {held}석에 예매가 있어요(입금 대기 포함).
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value, tone]) => (
          <div key={label}>
            <dt className="text-cap text-ink-3">{label}</dt>
            <dd className={`mt-0.5 text-lead font-bold tabular-nums ${tone || "text-ink"}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={() => void download()} className="btn-secondary btn-sm">
          명단 엑셀로 받기
        </button>
        <Link href="/admin/reservations/print" className="btn-secondary btn-sm">
          현장용 명단 인쇄
        </Link>
        {message && <p className="text-meta text-brand-600">{message}</p>}
      </div>
    </section>
  );
}
