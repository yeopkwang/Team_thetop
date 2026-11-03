"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api-client";
import { bookingNumber, formatDateTime } from "@/lib/format";
import { reservationStatus } from "@/lib/status";

type ReservationItem = {
  id: string;
  status: string;
  qty: number;
  preferredPerformerName: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
};

type ReservationListResponse = { reservations: ReservationItem[]; nextCursor: string | null };

const CACHE_KEY = "admin_reservations_cache_v1";
const PAGE_LIMIT = 80;

const FILTERS = [
  { id: "all", label: "전체", statuses: null },
  { id: "pending", label: "입금 대기", statuses: ["REQUESTED", "PAYMENT_PENDING"] },
  { id: "confirmed", label: "예매 완료", statuses: ["CONFIRMED"] },
  { id: "refund", label: "환불", statuses: ["REFUND_REQUESTED", "REFUND_PENDING", "REFUNDED"] },
  { id: "closed", label: "취소·만료", statuses: ["CANCELLED", "EXPIRED"] },
] as const;

export default function AdminReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = async (cursor?: string) => {
    const isLoadMore = Boolean(cursor);
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const qs = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) qs.set("cursor", cursor);
      const data = await apiFetch<ReservationListResponse>(`/admin/reservations?${qs.toString()}`);
      const incoming = Array.isArray(data?.reservations) ? data.reservations : [];
      const incomingCursor = data?.nextCursor || null;

      setItems((prev) => {
        const merged = isLoadMore
          ? [...prev, ...incoming.filter((x) => !prev.some((p) => p.id === x.id))]
          : incoming;
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ reservations: merged, nextCursor: incomingCursor }));
        return merged;
      });
      setNextCursor(incomingCursor);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "예매자 목록을 불러오지 못했어요.");
    } finally {
      if (isLoadMore) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(CACHE_KEY) || "null") as ReservationListResponse | null;
      if (cached?.reservations?.length) {
        setItems(cached.reservations);
        setNextCursor(cached.nextCursor || null);
        setLoading(false);
      }
    } catch {
      // 캐시가 깨졌으면 무시하고 새로 받는다
    }
    void load();
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.id, f.statuses ? items.filter((r) => (f.statuses as readonly string[]).includes(r.status)).length : items.length])
      ) as Record<string, number>,
    [items]
  );

  const filtered = useMemo(() => {
    const statuses = FILTERS.find((f) => f.id === filter)?.statuses as readonly string[] | null;
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (statuses && !statuses.includes(r.status)) return false;
      if (!q) return true;
      return [r.userName, r.userEmail || "", r.preferredPerformerName, bookingNumber(r.id)].join(" ").toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  return (
    <section>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="상태로 거르기">
          {FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={`h-9 shrink-0 rounded-full border px-3.5 text-meta font-semibold ${
                  on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-2 hover:border-ink-3"
                }`}
              >
                {f.label} <span className={on ? "text-white/70" : "text-ink-3"}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="lg:w-72">
          <span className="sr-only">검색</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 관심 공연자, 예매번호로 검색"
            className="field"
          />
        </label>
      </div>

      {message && <p className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">{message}</p>}

      {loading ? (
        <p className="py-16 text-center text-meta text-ink-3">불러오는 중</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-ui text-ink-3">조건에 맞는 예매가 없어요.</p>
      ) : (
        <>
          {/* PC: 표 */}
          <table className="mt-5 hidden w-full text-left text-ui md:table">
            <thead className="border-y border-line bg-surface text-meta text-ink-3">
              <tr>
                <th className="px-3 py-2.5 font-semibold">예매번호</th>
                <th className="px-3 py-2.5 font-semibold">예매자</th>
                <th className="px-3 py-2.5 font-semibold">관심 공연자</th>
                <th className="px-3 py-2.5 font-semibold">상태</th>
                <th className="px-3 py-2.5 text-right font-semibold">예매일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const s = reservationStatus(r.status);
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-3 font-semibold tabular-nums tracking-wide">{bookingNumber(r.id)}</td>
                    <td className="px-3 py-3">
                      {r.userName}
                      {r.userEmail && <span className="block text-cap text-ink-3">{r.userEmail}</span>}
                    </td>
                    <td className="px-3 py-3 text-ink-2">{r.preferredPerformerName}</td>
                    <td className="px-3 py-3">
                      <StatusBadge label={s.label} tone={s.tone} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-2">{formatDateTime(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 모바일: 목록 */}
          <ul className="mt-4 divide-y divide-line border-y border-line md:hidden">
            {filtered.map((r) => {
              const s = reservationStatus(r.status);
              return (
                <li key={r.id} className="py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold">{r.userName}</p>
                    <StatusBadge label={s.label} tone={s.tone} />
                  </div>
                  <p className="mt-1 text-meta text-ink-3">
                    관심 공연자 {r.preferredPerformerName}
                    <span className="mx-1.5 text-line-strong">|</span>
                    {bookingNumber(r.id)}
                  </p>
                  <p className="text-meta text-ink-3">{formatDateTime(r.createdAt)} 예매</p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {nextCursor && (
        <div className="mt-6 text-center">
          <button type="button" disabled={loadingMore} onClick={() => void load(nextCursor)} className="btn-secondary">
            {loadingMore ? "불러오는 중" : "더 불러오기"}
          </button>
        </div>
      )}
    </section>
  );
}
