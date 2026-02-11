"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RefundItem = {
  id: string;
  reservationId: string;
  status: string;
  createdAt: string;
  reservation?: {
    userId: string;
    status: string;
  };
};

export default function AdminRefundsPage() {
  const [items, setItems] = useState<RefundItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/refunds");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.refunds || []);
  };

  useEffect(() => {
    load();
  }, []);

  const refund = async (id: string) => {
    setMessage(null);
    const res = await fetch(`/api/admin/refunds/${id}/refund`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "오류");
    else {
      setMessage("환불 완료 처리됨");
      load();
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">환불 관리</h1>
      <div className="flex gap-2">
        <Link href="/admin" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
          예약 관리
        </Link>
        <Link href="/admin/refunds" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          환불 관리
        </Link>
      </div>
      {message && <div className="text-sm text-primary">{message}</div>}
      <div className="grid gap-3">
        {items.length === 0 && <div className="text-sm text-slate-500">환불 요청 내역이 없습니다.</div>}
        {items.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 p-3 space-y-1">
            <div className="font-semibold">환불 ID {r.id}</div>
            <div className="text-xs text-slate-500">예약 {r.reservationId}</div>
            <div className="text-xs text-slate-500">상태 {r.status}</div>
            <div className="text-xs text-slate-500">요청시각 {new Date(r.createdAt).toLocaleString("ko-KR")}</div>
            {r.status !== "REFUNDED" && (
              <button onClick={() => refund(r.id)} className="mt-2 px-3 py-1 bg-primary text-white rounded">
                환불 완료 처리
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
