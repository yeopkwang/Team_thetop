"use client";

import { useEffect, useState } from "react";

type Show = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  coverImage?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
};

export default function AdminShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    coverImage: "",
    startDate: "",
    endDate: "",
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
      content: form.content,
      coverImage: form.coverImage,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: tab === "upcoming",
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
      setForm({ title: "", description: "", content: "", coverImage: "", startDate: "", endDate: "" });
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
        <p className="text-sm text-slate-600">예정 공연은 예매/예약으로 노출, 지난 공연은 블로그형 게시로 노출됩니다.</p>
      </div>

      <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-3 py-1 rounded-full ${tab === "upcoming" ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
        >
          예정 공연 게시
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-3 py-1 rounded-full ${tab === "past" ? "bg-white shadow text-slate-900" : "text-slate-600"}`}
        >
          지난 공연 게시(블로그)
        </button>
      </div>

      <section className="rounded-xl bg-white shadow p-4 space-y-3">
        <h2 className="font-semibold">{tab === "upcoming" ? "예정 공연 등록" : "지난 공연 등록"}</h2>
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
          <label className="space-y-1">
            <span className="text-sm text-slate-600">대표 이미지 URL</span>
            <input
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="https://..."
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
          {tab === "past" && (
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm text-slate-600">본문(블로그형)</span>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full rounded border px-3 py-2 min-h-[140px]"
                placeholder="지난 공연 후기/콘텐츠를 작성하세요."
              />
            </label>
          )}
        </div>
        <button
          onClick={createShow}
          className="rounded bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
        >
          {tab === "upcoming" ? "예정 공연 등록" : "지난 공연 게시"}
        </button>
      </section>

      {message && <div className="text-sm text-primary">{message}</div>}

      <section className="space-y-3">
        <h2 className="font-semibold">전체 공연 목록</h2>
        {loading ? (
          <div className="text-sm text-slate-500">페이지를 준비하고 있습니다.</div>
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
                {show.coverImage && (
                  <div className="h-32 rounded overflow-hidden border">
                    <img src={show.coverImage} alt={show.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  {show.startDate ? new Date(show.startDate).toLocaleDateString("ko") : "날짜 없음"}
                </div>
                <p className="text-sm text-slate-600">{show.description}</p>
                {!show.isActive && show.content && (
                  <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-line">{show.content}</p>
                )}
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
