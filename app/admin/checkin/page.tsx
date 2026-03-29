"use client";

import { useState } from "react";

export default function AdminCheckinPage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "오류");
    else setMessage("체크인 완료");
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">검표</h1>
      <div className="flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="QR 토큰"
          className="border rounded px-3 py-2"
        />
        <button onClick={submit} className="px-3 py-2 bg-primary text-white rounded">
          체크인
        </button>
      </div>
      {message && <div className="text-sm text-primary">{message}</div>}
    </main>
  );
}
