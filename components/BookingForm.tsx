"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type EventItem = {
  id: string;
  startAt: string;
  totalStock: number;
  remainingStock: number;
};

type BookingResponse = {
  booking: { id: string };
};

// 예매 화면 아래쪽의 예매 폼. 잔여석은 /api/events에서 그때그때 받아 온다.
export default function BookingForm() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [preferredPerformerName, setPreferredPerformerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch<EventItem[]>("/events");
        const safe = Array.isArray(data) ? data : [];
        setEvents(safe);
        if (safe.length > 0) setSelectedSessionId(safe[0].id);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "공연 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const selectedSession = useMemo(
    () => events.find((event) => event.id === selectedSessionId) || events[0] || null,
    [events, selectedSessionId]
  );

  const trimmedPreferredPerformerName = preferredPerformerName.trim();
  const canSubmit = Boolean(selectedSession && trimmedPreferredPerformerName);

  const submit = async () => {
    if (isSubmitting) {
      setMessage("예매가 진행중입니다. 잠시만 기다려주세요.");
      return;
    }

    setMessage("");
    if (!selectedSessionId) {
      setMessage("예매 가능한 회차가 없습니다.");
      return;
    }
    if (!trimmedPreferredPerformerName) {
      setMessage("관심 있는 공연자 성함을 입력해 주세요. 없다면 '없음'을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("예매가 진행중입니다. 잠시만 기다려주세요.");

    try {
      await apiFetch<BookingResponse>("/bookings", {
        method: "POST",
        bodyJson: {
          eventId: selectedSessionId,
          quantity: 1,
          preferredPerformerName: trimmedPreferredPerformerName,
        },
      });
      localStorage.setItem("hasBooked", "1");
      window.location.href = "/myticket";
    } catch (submitError: unknown) {
      setMessage(submitError instanceof Error ? submitError.message : "예매 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <section className="rounded-2xl bg-white p-5 shadow md:p-6">잔여석을 확인하고 있습니다.</section>;
  if (error) return <section className="rounded-2xl bg-white p-5 shadow md:p-6">오류: {error}</section>;

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-6">
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

      <div className="space-y-2">
        <label htmlFor="preferredPerformerName" className="text-sm font-medium text-slate-800">
          관심 있는 공연자 성함을 입력해 주세요. 없다면 '없음'을 입력해 주세요.
        </label>
        <input
          id="preferredPerformerName"
          type="text"
          value={preferredPerformerName}
          onChange={(e) => setPreferredPerformerName(e.target.value)}
          placeholder="예: 홍길동 또는 없음"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || isSubmitting}
        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "예매 진행중..." : "예매하기"}
      </button>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </section>
  );
}
