"use client";

import { useEffect, useState } from "react";

export default function AdminRefundsPage() {
  const [items, setItems] = useState<any[]>([]);
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
      setMessage("환불 완료");
      load();
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">환불 관리</h1>
      {message && <div className="text-sm text-primary">{message}</div>}
      <div className="grid gap-3">
        {items.map((r) => (
          <div key={r.id} className="rounded border border-slate-200 p-3">
            <div className="font-semibold">예약 {r.reservationId}</div>
            <div className="text-xs text-slate-500">상태 {r.status}</div>
            <div className="text-xs text-slate-500">계좌 {r.account?.bankName}</div>
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
