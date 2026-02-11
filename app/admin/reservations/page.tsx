"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { springFetch } from "@/lib/spring-client";

type ReservationItem = {
  id: string;
  status: string;
  qty: number;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  event?: {
    title?: string;
    venue?: string;
    date?: string;
    time?: string;
  };
};

export default function AdminReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await springFetch<{ reservations: ReservationItem[] }>("/admin/reservations");
      setItems(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "예매자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => {
      const haystack = [
        r.userName,
        r.userEmail || "",
        r.userId,
        r.event?.title || "",
        r.event?.venue || "",
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">전체 예매자 목록</h1>

      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">관리 메뉴</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            QR 검표
          </Link>
          <Link href="/admin/reservations" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            전체 예매자 목록
          </Link>
          <Link href="/admin/refunds" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            환불 관리
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            전체 {items.length}건 / 검색 결과 {filtered.length}건
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 이메일, 공연명, 상태 검색"
            className="w-full max-w-sm rounded border px-3 py-2 text-sm"
          />
        </div>

        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-slate-500">표시할 예매가 없습니다.</p>}

        <div className="grid gap-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded border p-3 space-y-1">
              <p className="font-semibold">예매자: {r.userName}</p>
              <p className="text-sm text-slate-600">예매자 ID: {r.userId}</p>
              <p className="text-sm text-slate-600">이메일: {r.userEmail || "-"}</p>
              <p className="text-sm text-slate-600">예매 일시: {new Date(r.createdAt).toLocaleString("ko-KR")}</p>
              <p className="text-sm text-slate-600">상태: {r.status}</p>
              <p className="text-sm text-slate-600">수량: {r.qty}</p>
              <p className="text-sm text-slate-600">공연명: {r.event?.title || "-"}</p>
              <p className="text-sm text-slate-600">공연 장소: {r.event?.venue || "-"}</p>
              <p className="text-sm text-slate-600">
                공연 일시: {r.event?.date || "-"} {r.event?.time ? `/ ${r.event.time}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </main>
  );
}
