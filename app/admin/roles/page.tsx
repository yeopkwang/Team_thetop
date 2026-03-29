"use client";

import { useEffect, useState } from "react";

export default function AdminRolesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/roles/requests");
    if (!res.ok) return;
    const data = await res.json();
    setRequests(data.requests || []);
  };

  useEffect(() => {
    load();
  }, []);

  const requestAdmin = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/roles/requests", { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "오류");
    else {
      setMessage("요청 완료");
      load();
    }
  };

  const decide = async (id: string, action: "APPROVE" | "REJECT") => {
    setMessage(null);
    const res = await fetch("/api/admin/roles/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, decision: action }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "오류");
    else {
      setMessage("처리 완료");
      load();
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">권한 관리</h1>
      <button onClick={requestAdmin} className="px-4 py-2 bg-primary text-white rounded">
        ADMIN 권한 요청
      </button>
      {message && <div className="text-sm text-primary">{message}</div>}
      <div className="grid gap-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded border p-3">
            <div className="font-semibold">{r.userName}</div>
            <div className="text-xs text-slate-500">{r.status}</div>
            <div className="text-xs text-slate-500">{r.createdAt}</div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => decide(r.id, "APPROVE")}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                승인
              </button>
              <button
                onClick={() => decide(r.id, "REJECT")}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                반려
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
