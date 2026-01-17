"use client";

import { useEffect, useState } from "react";

export default function AdminReservationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/reservations");
    const data = await res.json();
    if (res.ok) setItems(data.reservations || []);
  };

  useEffect(() => {
    load();
  }, []);

  const confirm = async (id: string) => {
    setMessage(null);
    const res = await fetch(`/api/admin/reservations/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "오류");
    } else {
      setMessage("CONFIRMED");
      load();
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">예약 관리</h1>
      {message && <div className="text-sm text-primary">{message}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="p-2">ID</th>
              <th className="p-2">사용자</th>
              <th className="p-2">상태</th>
              <th className="p-2">수량</th>
              <th className="p-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.userName}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.qty}</td>
                <td className="p-2">
                  {r.status !== "CONFIRMED" && (
                    <button
                      onClick={() => confirm(r.id)}
                      className="px-3 py-1 rounded bg-primary text-white"
                    >
                      CONFIRM
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
