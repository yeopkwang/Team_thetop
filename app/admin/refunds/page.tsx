"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { springFetch } from "@/lib/spring-client";

type RefundItem = {
  id: string;
  reservationId: string;
  status: string;
  createdAt: string;
  reservation?: {
    userId: string;
    status: string;
    qty?: number;
  };
};

export default function AdminRefundsPage() {
  const [items, setItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await springFetch<{ refunds: RefundItem[] }>("/admin/refunds");
      setItems(Array.isArray(data?.refunds) ? data.refunds : []);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "환불 요청 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refund = async (id: string) => {
    setMessage("");
    try {
      await springFetch(`/admin/refunds/${id}/refund`, { method: "POST", bodyJson: {} });
      setMessage("환불 완료 처리되었습니다. 좌석 수량이 복구되었습니다.");
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "환불 완료 처리에 실패했습니다.");
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">환불 관리</h1>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          QR 검표
        </Link>
        <Link href="/admin/reservations" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          전체 예매자 목록
        </Link>
        <Link href="/admin/refunds" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          환불 관리
        </Link>
      </div>

      {message && <div className="text-sm text-slate-700">{message}</div>}

      <div className="grid gap-3">
        {loading && <div className="text-sm text-slate-500">불러오는 중...</div>}
        {!loading && items.length === 0 && <div className="text-sm text-slate-500">환불 요청 내역이 없습니다.</div>}

        {items.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 p-3 space-y-1">
            <div className="font-semibold">환불 ID: {r.id}</div>
            <div className="text-xs text-slate-500">예약 ID: {r.reservationId}</div>
            <div className="text-xs text-slate-500">예약자 ID: {r.reservation?.userId || "-"}</div>
            <div className="text-xs text-slate-500">상태: {r.status}</div>
            <div className="text-xs text-slate-500">요청 시각: {new Date(r.createdAt).toLocaleString("ko-KR")}</div>

            {r.status !== "REFUNDED" && (
              <button
                type="button"
                onClick={() => void refund(r.id)}
                className="mt-2 rounded bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
              >
                환불 완료 처리
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
