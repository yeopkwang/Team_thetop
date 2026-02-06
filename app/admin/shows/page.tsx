"use client";

import { useEffect, useState } from "react";

type Show = {
  id: string;
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
};

export default function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    isActive: false, // 기본을 지난공연 게시로
  });

  const load = async () => {
    const res = await fetch("/api/admin/shows");
    const data = await res.json();
    if (res.ok) setShows(data.shows || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createShow = async () => {
    setMessage(null);
    const payload = {
      title: form.title,
      description: form.description,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };
    const res = await fetch("/api/admin/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "생성 실패");
    else {
      setMessage("공연이 등록되었습니다.");
      setForm({ title: "", description: "", startDate: "", endDate: "", isActive: false });
      load();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setMessage(null);
    const res = await fetch("/api/admin/shows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "업데이트 실패");
    else {
      setMessage("상태가 변경되었습니다.");
      load();
    }
  };

  return (
    <main className="container-base space-y-6">
      <div>
        <p className="text-sm text-slate-500">ADMIN · 공연 관리</p>
        <h1 className="text-2xl font-bold">예정/지난 공연 등록 및 게시</h1>
        <p className="text-sm text-slate-600">예정 공연은 예매/예약으로 노출, 지난 공연은 홈에 게시됩니다.</p>
      </div>

      <section className="rounded-xl bg-white shadow p-4 space-y-3">
        <h2 className="font-semibold">공연 등록</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-slate-600">제목</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="공연 제목"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-600">시작일</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-600">종료일</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-slate-600">설명</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded border px-3 py-2 min-h-[80px]"
              placeholder="공연 설명"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span className="text-sm">예정 공연으로 노출 (체크 해제 시 지난 공연 게시)</span>
          </label>
        </div>
        <button
          onClick={createShow}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          공연 등록
        </button>
      </section>

      {message && <div className="text-sm text-primary">{message}</div>}

      <section className="space-y-3">
        <h2 className="font-semibold">전체 공연 목록</h2>
        {loading ? (
          <div className="text-sm text-slate-500">불러오는 중...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {shows.map((show) => (
              <div key={show.id} className="rounded-lg border border-slate-200 p-4 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{show.title}</div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      show.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {show.isActive ? "예정" : "지난 공연"}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {show.startDate ? new Date(show.startDate).toLocaleDateString("ko") : "날짜 없음"}
                </div>
                <p className="text-sm text-slate-600">{show.description}</p>
                <div className="flex gap-2">
                  {!show.isActive && (
                    <button
                      onClick={() => toggleActive(show.id, true)}
                      className="px-3 py-1 rounded border border-slate-300 text-sm"
                    >
                      예정 공연으로 전환
                    </button>
                  )}
                  {show.isActive && (
                    <button
                      onClick={() => toggleActive(show.id, false)}
                      className="px-3 py-1 rounded border border-slate-300 text-sm"
                    >
                      지난 공연으로 게시
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
