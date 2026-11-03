"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, readAdminCache, writeAdminCache } from "@/lib/api-client";
import { bookingNumber, formatDateTime } from "@/lib/format";
import { refundStatus } from "@/lib/status";

type RefundItem = {
  id: string;
  reservationId: string;
  status: string;
  createdAt: string;
  reservation?: { userId: string; user?: { name?: string | null; email?: string | null } };
};

export default function AdminRefundsPage() {
  const [items, setItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch<{ refunds: RefundItem[] }>("/admin/refunds");
      const refunds = Array.isArray(data?.refunds) ? data.refunds : [];
      setItems(refunds);
      writeAdminCache("refunds", refunds);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "환불 요청 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 전에 본 목록이 있으면 먼저 보여 주고 새 목록으로 바꾼다.
    const cached = readAdminCache<RefundItem[]>("refunds");
    if (cached) {
      setItems(cached);
      setLoading(false);
    }
    void load();
  }, []);

  const complete = async (item: RefundItem) => {
    const name = item.reservation?.user?.name || "예매자";
    if (!window.confirm(`${name}님께 송금을 마쳤나요? 환불 완료로 바꾸면 되돌릴 수 없어요.`)) return;
    setBusy(item.id);
    setMessage("");
    try {
      await apiFetch(`/admin/refunds/${item.id}/refund`, { method: "POST", bodyJson: {} });
      setMessage(`${name}님 환불을 완료했어요.`);
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "환불 완료로 바꾸지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const waiting = items.filter((r) => r.status !== "REFUNDED").length;

  return (
    <section>
      <h2 className="text-lead font-bold">
        환불 요청 <span className="text-brand-600">{loading ? "" : waiting}</span>
      </h2>
      <p className="mt-1 text-meta text-ink-3">관객이 카카오톡으로 알려 준 계좌로 송금한 뒤 환불 완료를 눌러 주세요.</p>

      {message && (
        <p role="status" className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">
          {message}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {loading && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
        {!loading && items.length === 0 && <li className="py-10 text-center text-ui text-ink-3">환불 요청이 없어요.</li>}
        {items.map((r) => {
          const s = refundStatus(r.status);
          return (
            <li key={r.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold">{r.reservation?.user?.name || "이름 없음"}</p>
                  <StatusBadge label={s.label} tone={s.tone} />
                </div>
                <p className="mt-0.5 text-meta text-ink-3">
                  예매번호 {bookingNumber(r.reservationId)}
                  <span className="mx-1.5 text-line-strong">|</span>
                  {formatDateTime(r.createdAt)} 요청
                </p>
              </div>
              {r.status !== "REFUNDED" && (
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => void complete(r)}
                  className="btn-primary btn-sm shrink-0"
                >
                  {busy === r.id ? "처리 중" : "환불 완료"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
