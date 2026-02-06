"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ShowSession {
  id: string;
  title: string;
  date: string;
  totalCapacity: number;
  soldQty: number;
}

interface Show {
  id: string;
  title: string;
  description?: string | null;
  sessions: ShowSession[];
}

export default function BookPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/book/shows");
        if (!res.ok) throw new Error("Failed to load shows");
        const data = await res.json();
        setShows(data.shows || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const submit = async () => {
    setMessage(null);
    if (!selectedSession) return setMessage("회차를 선택하세요");
    try {
      const res = await fetch("/api/book/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession, qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "예약 실패");
      setMessage(`예약 생성: ${data.reservation.id}. 24시간 내 입금하세요.`);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  if (loading) return <main className="container-base">불러오는 중...</main>;
  if (error) return <main className="container-base">오류: {error}</main>;

  return (
    <main className="container-base space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">예매 · 예약</p>
          <h1 className="text-2xl font-bold">공연 예약하기</h1>
          <p className="text-sm text-slate-600">관리자가 올린 회차를 선택하고 예약을 진행하세요.</p>
        </div>
        <Link
          href="/mypage"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          내 예약 확인
        </Link>
      </div>
      <div className="grid gap-4">
        {shows.map((show) => (
          <div key={show.id} className="rounded-lg bg-white shadow p-4 space-y-2">
            <div className="font-semibold text-lg">{show.title}</div>
            <p className="text-sm text-slate-600">{show.description}</p>
            <div className="grid gap-2">
              {show.sessions.map((s) => {
                const remaining = s.totalCapacity - s.soldQty;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className={`flex justify-between rounded border p-2 text-left ${
                      selectedSession === s.id ? "border-primary" : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-slate-500">{new Date(s.date).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">잔여 {remaining}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="border rounded px-3 py-2 w-28"
        />
        <button
          onClick={submit}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-slate-800"
        >
          예약 생성
        </button>
      </div>
      {message && <div className="text-sm text-primary">{message}</div>}
    </main>
  );
}
