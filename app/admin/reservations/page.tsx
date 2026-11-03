"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, readAdminCache, writeAdminCache } from "@/lib/api-client";
import { bookingNumber, formatDateTime } from "@/lib/format";
import { reservationStatus } from "@/lib/status";

type ReservationItem = {
  id: string;
  status: string;
  qty: number;
  preferredPerformerName: string;
  depositorName: string;
  cancelReason: string;
  expiresAt: string;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  event?: { title?: string };
};

type ReservationListResponse = { reservations: ReservationItem[]; nextCursor: string | null };

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
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (cursor?: string) => {
    const isLoadMore = Boolean(cursor);
    // 새로 받을 때는 보고 있던 목록을 그대로 두고 뒤에서 바꾼다(처음엔 loading이 이미 true).
    if (isLoadMore) setLoadingMore(true);

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
        writeAdminCache("reservations", { reservations: merged, nextCursor: incomingCursor });
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
    // 전에 본 목록이 있으면 먼저 보여 주고 새 목록으로 바꾼다.
    const cached = readAdminCache<ReservationListResponse>("reservations");
    if (cached?.reservations?.length) {
      setItems(cached.reservations);
      setNextCursor(cached.nextCursor || null);
      setLoading(false);
    }
    void load();
  }, []);

  // 입금 확인·운영진 취소·만료 예매 되살리기. 처리한 뒤 목록을 새로 받는다.
  const act = async (r: ReservationItem, kind: "confirm" | "cancel") => {
    const who = r.depositorName || r.userName;
    let body: Record<string, unknown> = {};
    if (kind === "cancel") {
      const reason = window.prompt(`${who}님 예매를 취소할까요? 취소 사유를 적어 주세요. 관객의 마이 티켓에 보여요.`, "입금 기한 안에 입금이 확인되지 않았어요.");
      if (!reason?.trim()) return;
      body = { reason: reason.trim() };
    }
    setBusy(r.id);
    setMessage("");
    try {
      await apiFetch(`/admin/bookings/${r.id}/${kind}`, { method: "POST", bodyJson: body });
      setMessage(kind === "confirm" ? `${who}님 입금을 확인했어요. QR 티켓이 발급됐어요.` : `${who}님 예매를 취소했어요.`);
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const actions = (r: ReservationItem) =>
    r.status === "PAYMENT_PENDING" || r.status === "REQUESTED" ? (
      <span className="flex justify-end gap-1">
        <button type="button" disabled={busy !== null} onClick={() => void act(r, "confirm")} className="btn-primary btn-sm">
          입금 확인
        </button>
        <button type="button" disabled={busy !== null} onClick={() => void act(r, "cancel")} className="btn-ghost btn-sm text-ink-3">
          취소
        </button>
      </span>
    ) : r.status === "EXPIRED" ? (
      <span className="flex justify-end">
        <button type="button" disabled={busy !== null} onClick={() => void act(r, "confirm")} className="btn-secondary btn-sm">
          되살리기
        </button>
      </span>
    ) : null;

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
      return [r.depositorName, r.userName, r.userEmail || "", r.preferredPerformerName, bookingNumber(r.id), r.event?.title || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
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
            placeholder="입금자명, 이름, 관심 공연자, 예매번호로 검색"
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
                <th className="px-3 py-2.5 font-semibold">공연</th>
                <th className="px-3 py-2.5 font-semibold">입금자명</th>
                <th className="px-3 py-2.5 font-semibold">관심 공연자</th>
                <th className="px-3 py-2.5 font-semibold">상태</th>
                <th className="px-3 py-2.5 text-right font-semibold">예매일시</th>
                <th className="px-3 py-2.5">
                  <span className="sr-only">처리</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const s = reservationStatus(r.status);
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-3 font-semibold tabular-nums tracking-wide">{bookingNumber(r.id)}</td>
                    <td className="px-3 py-3 text-ink-2">{r.event?.title || "-"}</td>
                    <td className="px-3 py-3">
                      {r.depositorName || r.userName}
                      <span className="block text-cap text-ink-3">카카오 {r.userName}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{r.preferredPerformerName}</td>
                    <td className="px-3 py-3">
                      <StatusBadge label={s.label} tone={s.tone} />
                      {r.cancelReason && <span className="mt-1 block max-w-[180px] text-cap text-ink-3">{r.cancelReason}</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-2">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-3">{actions(r)}</td>
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
                    <p className="text-[15px] font-semibold">{r.depositorName || r.userName}</p>
                    <StatusBadge label={s.label} tone={s.tone} />
                  </div>
                  <p className="mt-1 text-meta text-ink-3">
                    {r.event?.title && (
                      <>
                        {r.event.title}
                        <span className="mx-1.5 text-line-strong">|</span>
                      </>
                    )}
                    관심 공연자 {r.preferredPerformerName}
                    <span className="mx-1.5 text-line-strong">|</span>
                    {bookingNumber(r.id)}
                  </p>
                  <p className="text-meta text-ink-3">
                    {formatDateTime(r.createdAt)} 예매
                    {r.depositorName && `, 카카오 ${r.userName}`}
                  </p>
                  {r.cancelReason && <p className="text-meta text-ink-3">취소 사유: {r.cancelReason}</p>}
                  {actions(r) && <div className="mt-2">{actions(r)}</div>}
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
