"use client";

import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, errorMessage, readAdminCache, writeAdminCache } from "@/lib/api-client";
import { matchDeposits } from "@/lib/deposit-match";
import { bookingNumber, formatDateTime, won } from "@/lib/format";

type Pending = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  depositorName: string;
  preferredPerformerName: string;
  amount: number;
  kakaoName: string | null;
  showTitle: string;
};

type BatchResult = { results: { id: string; ok: boolean; error?: string }[] };

const DEFAULT_REASON = "입금 기한 안에 입금이 확인되지 않았어요.";

// 관리자 첫 화면의 입금 확인. 은행 앱의 입금 내역을 붙여 넣으면 입금자명·금액이 맞는 예매를 골라 한 번에 확인한다.
// 입금하지 않은 예매는 사유를 적어 취소하고, 기한이 지나 만료된 예매는 늦게 확인한 입금이면 되살린다.
export default function PendingDeposits() {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  // 관리자가 직접 켜고 끈 체크만 기억한다. 나머지는 '이름과 금액이 맞으면 골라 둠'으로 계산한다.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState(DEFAULT_REASON);

  const load = async () => {
    try {
      const data = await apiFetch<{ bookings: Pending[] }>("/admin/bookings/pending");
      const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
      setItems(bookings);
      writeAdminCache("pending", bookings);
    } catch (error: unknown) {
      setMessage(errorMessage(error, "입금 대기 목록을 불러오지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 전에 본 목록이 있으면 먼저 보여 주고 새 목록으로 바꾼다.
    const cached = readAdminCache<Pending[]>("pending");
    if (cached) {
      setItems(cached);
      setLoading(false);
    }
    void load();
  }, []);

  const lines = useMemo(() => (pasted.trim() ? matchDeposits(pasted, items) : []), [pasted, items]);
  const isChecked = (id: string) => overrides[id] ?? lines.some((l) => l.kind === "match" && l.booking.id === id);
  const checked = Array.from(
    new Set(lines.flatMap((l) => (l.kind === "match" || l.kind === "amount" ? [l.booking.id] : [])))
  ).filter(isChecked);

  const nameOf = (b: Pending) => b.depositorName || b.kakaoName || "이름 없음";

  const run = async (key: string, task: () => Promise<string>) => {
    setBusy(key);
    setMessage("");
    try {
      setMessage(await task());
      await load();
    } catch (error: unknown) {
      setMessage(errorMessage(error, "처리하지 못했어요."));
    } finally {
      setBusy(null);
    }
  };

  const confirmOne = (b: Pending) =>
    run(b.id, async () => {
      await apiFetch(`/admin/bookings/${b.id}/confirm`, { method: "POST", bodyJson: {} });
      return `${nameOf(b)}님 입금을 확인했어요. QR 티켓이 발급됐어요.`;
    });

  const confirmMany = (ids: string[]) =>
    run("batch", async () => {
      const { results } = await apiFetch<BatchResult>("/admin/bookings/confirm", { method: "POST", bodyJson: { ids } });
      const failed = results.filter((r) => !r.ok);
      const done = results.length - failed.length;
      if (failed.length === 0) {
        setPasted("");
        setOverrides({});
        setPasteOpen(false);
        return `${done}건 입금을 확인했어요. QR 티켓이 발급됐어요.`;
      }
      const why = failed.map((r) => `${nameOf(items.find((b) => b.id === r.id) || ({} as Pending))}: ${r.error}`).join(" / ");
      return `${done}건은 확인했고, ${failed.length}건은 확인하지 못했어요. ${why}`;
    });

  const cancelOne = (b: Pending) =>
    run(b.id, async () => {
      await apiFetch(`/admin/bookings/${b.id}/cancel`, { method: "POST", bodyJson: { reason: reason.trim() } });
      setCancelling(null);
      setReason(DEFAULT_REASON);
      return `${nameOf(b)}님 예매를 취소했어요. 좌석이 다시 풀렸어요.`;
    });

  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  const visible = items.filter(
    (b) =>
      !q ||
      [b.depositorName, b.kakaoName || "", b.preferredPerformerName, bookingNumber(b.id)].join("").toLowerCase().replace(/\s+/g, "").includes(q)
  );
  const pending = visible.filter((b) => b.status !== "EXPIRED");
  const expired = visible.filter((b) => b.status === "EXPIRED");
  const pendingTotal = items.filter((b) => b.status !== "EXPIRED").length;
  const found = lines.filter((l) => l.kind !== "none");
  const skipped = lines.length - found.length;

  const toggle = (id: string) => setOverrides((prev) => ({ ...prev, [id]: !isChecked(id) }));

  const row = (b: Pending, late: boolean) => {
    const kakao = b.kakaoName || "";
    return (
      <li key={b.id} className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              {nameOf(b)}
              {b.depositorName && kakao && kakao !== b.depositorName && (
                <span className="ml-1.5 text-meta font-normal text-ink-3">카카오 {kakao}</span>
              )}
            </p>
            <p className="mt-0.5 text-meta text-ink-3">
              {won(b.amount)}
              <span className="mx-1.5 text-line-strong">|</span>
              관심 공연자 {b.preferredPerformerName}
              <span className="mx-1.5 text-line-strong">|</span>
              {bookingNumber(b.id)}
            </p>
            <p className={`text-meta ${late ? "text-brand-600" : "text-ink-3"}`}>
              {b.showTitle}, 
              {late ? `${formatDateTime(b.expiresAt)}에 기한 지남` : `${formatDateTime(b.expiresAt)}까지 입금`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" disabled={busy !== null} onClick={() => void confirmOne(b)} className="btn-primary btn-sm">
              {busy === b.id ? "처리 중" : late ? "입금 확인 (되살리기)" : "입금 확인"}
            </button>
            {!late && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setCancelling(cancelling === b.id ? null : b.id);
                  setReason(DEFAULT_REASON);
                }}
                className="btn-ghost text-cap text-ink-3"
              >
                예매 취소
              </button>
            )}
          </div>
        </div>
        {cancelling === b.id && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void cancelOne(b);
            }}
            className="mt-3 rounded-md bg-surface p-3"
          >
            <label htmlFor={`reason-${b.id}`} className="text-meta font-semibold text-ink-2">
              취소 사유 (관객의 마이 티켓에 보여요)
            </label>
            <input
              id={`reason-${b.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
              className="field mt-1.5 text-ui"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button type="submit" disabled={busy !== null || !reason.trim()} className="btn btn-sm bg-ink text-white hover:bg-ink-2">
                {busy === b.id ? "취소하는 중" : "예매 취소하기"}
              </button>
              <button type="button" onClick={() => setCancelling(null)} className="btn-ghost text-meta">
                닫기
              </button>
            </div>
          </form>
        )}
      </li>
    );
  };

  return (
    <section aria-labelledby="pending-title">
      <div className="flex items-baseline justify-between">
        <h2 id="pending-title" className="text-lead font-bold">
          입금 확인 대기 <span className="text-brand-600">{loading ? "" : pendingTotal}</span>
        </h2>
        <button type="button" onClick={() => void load()} className="btn-ghost text-meta">
          새로고침
        </button>
      </div>
      <p className="mt-1 text-meta text-ink-3">은행 앱의 입금 내역을 붙여 넣으면 입금자명과 금액이 맞는 예매를 찾아 줘요.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          aria-expanded={pasteOpen}
          onClick={() => setPasteOpen((v) => !v)}
          className={pasteOpen ? "btn-primary btn-sm shrink-0" : "btn-secondary btn-sm shrink-0"}
        >
          입금 내역 붙여넣기
        </button>
        <label className="flex-1">
          <span className="sr-only">예매 찾기</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="입금자명, 카카오 이름, 예매번호로 찾기"
            className="field h-10 py-0 text-ui"
          />
        </label>
      </div>

      {pasteOpen && (
        <div className="mt-3 rounded-lg border border-line p-4">
          <label htmlFor="deposit-paste" className="text-meta font-semibold text-ink-2">
            입금 내역
          </label>
          <textarea
            id="deposit-paste"
            rows={5}
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setOverrides((prev) => (Object.keys(prev).length ? {} : prev));
            }}
            placeholder={"은행 앱에서 입금 내역을 복사해 그대로 붙여 넣으세요. 줄마다 한 건씩 봐요.\n예) 11.03 14:22 입금 홍길동 7,000원"}
            className="field mt-1.5 text-meta leading-6"
          />
          {lines.length > 0 && (
            <div className="mt-4">
              <p className="text-meta font-semibold text-ink">
                맞는 예매 {lines.filter((l) => l.kind === "match").length}건
                {skipped > 0 && <span className="font-normal text-ink-3">, 예매와 상관없는 줄 {skipped}개는 건너뛰었어요</span>}
              </p>
              {found.length > 0 && (
                <ul className="mt-2 divide-y divide-line rounded-md border border-line">
                  {found.map((l, i) => {
                    const pickable = l.kind === "match" || l.kind === "amount";
                    const booking = "booking" in l ? l.booking : null;
                    const note =
                      l.kind === "match"
                        ? null
                        : l.kind === "amount"
                          ? `금액을 확인해 주세요. ${won(l.booking.amount)}이어야 해요.`
                          : l.kind === "duplicate"
                            ? "같은 예매에 입금이 한 번 더 있어요. 중복 입금이면 돌려드려 주세요."
                            : l.kind === "ambiguous"
                              ? `입금자명이 '${l.name}'인 예매가 ${l.bookings.length}건이라 고르지 않았어요. 아래 목록에서 직접 확인해 주세요.`
                              : null;
                    return (
                      <li key={i} className="flex gap-3 px-3 py-2.5">
                        {pickable && booking ? (
                          <input
                            type="checkbox"
                            checked={isChecked(booking.id)}
                            onChange={() => toggle(booking.id)}
                            aria-label={`${nameOf(booking)} 입금 확인할 예매로 고르기`}
                            className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
                          />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          {booking && (
                            <p className="flex flex-wrap items-center gap-x-2 text-ui font-semibold">
                              {nameOf(booking)}
                              <span className="text-meta font-normal text-ink-3">
                                {won(booking.amount)}, {bookingNumber(booking.id)}
                              </span>
                              {booking.status === "EXPIRED" && <StatusBadge label="기한 지남" tone="muted" />}
                            </p>
                          )}
                          <p className="truncate text-cap text-ink-3">{l.line}</p>
                          {note && <p className="mt-0.5 text-cap font-semibold text-wait-700">{note}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                disabled={checked.length === 0 || busy !== null}
                onClick={() => void confirmMany(checked)}
                className="btn-primary mt-3 w-full sm:w-auto"
              >
                {busy === "batch" ? "확인하는 중" : `고른 ${checked.length}건 입금 확인`}
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">
          {message}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {loading && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
        {!loading && pending.length === 0 && (
          <li className="py-10 text-center text-ui text-ink-3">{q ? "찾는 예매가 없어요." : "입금 확인을 기다리는 예매가 없어요."}</li>
        )}
        {pending.map((b) => row(b, false))}
      </ul>

      {expired.length > 0 && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-meta font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            기한이 지나 만료된 예매 {expired.length}건
            <span className="transition-transform group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>
          <p className="mt-1 text-meta text-ink-3">기한 안에 입금했는데 늦게 확인했다면 되살릴 수 있어요. 좌석이 남아 있어야 해요.</p>
          <ul className="mt-2 divide-y divide-line border-y border-line">{expired.map((b) => row(b, true))}</ul>
        </details>
      )}
    </section>
  );
}
