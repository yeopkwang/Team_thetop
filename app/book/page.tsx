"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { springFetch } from "@/lib/spring-client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

type EventItem = {
  id: string;
  startAt: string;
  totalStock: number;
  remainingStock: number;
};

type BookingResponse = {
  booking: { id: string };
  payment?: { holder: string; bank: string; account: string; amount: number };
};

export default function BookPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await springFetch<EventItem[]>("/events");
        const safe = Array.isArray(data) ? data : [];
        setEvents(safe);
        if (safe.length > 0) setSelectedSessionId(safe[0].id);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "공연 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectedSession = useMemo(
    () => events.find((event) => event.id === selectedSessionId) || events[0] || null,
    [events, selectedSessionId]
  );

  const submit = async () => {
    setMessage("");
    if (!selectedSessionId) {
      setMessage("예매 가능한 회차가 없습니다.");
      return;
    }

    try {
      const data = await springFetch<BookingResponse>("/bookings", {
        method: "POST",
        bodyJson: { eventId: selectedSessionId, quantity: 1 },
      });
      localStorage.setItem("hasBooked", "1");
      setMessage(
        `예약 대기 상태입니다. ${CURRENT_SHOW_INFO.payment.holder} : ${CURRENT_SHOW_INFO.payment.bank} ${CURRENT_SHOW_INFO.payment.account} 로 ${CURRENT_SHOW_INFO.payment.amount.toLocaleString()}원 입금 후 관리자 승인까지 기다려주세요. (예약번호: ${data.booking.id})`
      );
      window.location.href = "/myticket";
    } catch (submitError: unknown) {
      setMessage(submitError instanceof Error ? submitError.message : "예매 요청에 실패했습니다.");
    }
  };

  if (loading) return <main className="container-base">불러오는 중...</main>;
  if (error) return <main className="container-base">오류: {error}</main>;

  return (
    <main className="container-base space-y-6">
      <section className="rounded-2xl bg-white shadow p-5 md:p-8">
        <p className="text-sm font-semibold text-red-700">현재 예매 가능한 공연</p>
        <h1 className="mt-2 text-3xl font-bold">{CURRENT_SHOW_INFO.title}</h1>
        <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="rounded-xl border bg-slate-50 p-3">
            <img src={CURRENT_SHOW_INFO.posterUrl} alt="공연 포스터" className="w-full rounded-lg object-cover" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">일시</div>
              <div>{CURRENT_SHOW_INFO.dateLabel}</div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">시간</div>
              <div>
                <div>{CURRENT_SHOW_INFO.timeLabel}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.timeSubLabel}</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">장소</div>
              <div>
                <div>{CURRENT_SHOW_INFO.venue}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.venueAddress}</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">문의</div>
              <div>
                <div>{CURRENT_SHOW_INFO.contactName}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.contactTag}</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <div className="text-slate-500">입장 관련</div>
              <div>{CURRENT_SHOW_INFO.audienceInfo}</div>
            </div>
            <p className="pt-2 text-sm text-slate-600">{CURRENT_SHOW_INFO.notice}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">예매하기</h2>
          <Link
            href="/myticket"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            내 티켓 확인
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-slate-600">1인 1매만 예매 가능합니다.</p>
          {selectedSession ? (
            <div className="rounded border p-3 text-sm text-slate-700">
              잔여 좌석: {Math.max(0, selectedSession.remainingStock)} / {selectedSession.totalStock}
            </div>
          ) : (
            <div className="rounded border p-3 text-sm text-slate-700">예매 가능한 회차가 없습니다.</div>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!selectedSession}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          예매하기
        </button>

        {message && <p className="text-sm text-slate-700">{message}</p>}
      </section>
    </main>
  );
}
