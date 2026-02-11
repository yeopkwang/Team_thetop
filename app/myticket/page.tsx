"use client";

import { useEffect, useMemo, useState } from "react";
import { springFetch } from "@/lib/spring-client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

type Booking = {
  id: string;
  status: "PAYMENT_PENDING" | "CONFIRMED" | string;
  createdAt: string;
  quantity: number;
  event?: { title?: string; venue?: string };
};

type Ticket = {
  id: string;
  ticketCode: string;
  checkedInAt?: string | null;
  booking?: { id: string };
};

type TicketPayload = {
  booking: Booking;
  tickets: Ticket[];
};

export default function MyTicketPage() {
  const [payload, setPayload] = useState<TicketPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const bookings = await springFetch<Booking[]>("/my/bookings");
        if (!Array.isArray(bookings) || bookings.length === 0) {
          setPayload(null);
          return;
        }

        const latest = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
        const tickets = await springFetch<Ticket[]>("/my/tickets");
        const related = Array.isArray(tickets) ? tickets.filter((t) => t.booking?.id === latest.id) : [];
        const data: TicketPayload = { booking: latest, tickets: related };
        setPayload(data);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "티켓 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const tickets = useMemo(() => {
    if (!payload) return [];
    if (payload.tickets.length > 0) return payload.tickets;
    return Array.from({ length: Math.max(1, payload.booking.quantity || 1) }, (_, i) => ({
      id: `temp-${i + 1}`,
      ticketCode: "",
      checkedInAt: null,
      booking: { id: payload.booking.id },
    }));
  }, [payload]);

  if (loading) return <main className="container-base">불러오는 중...</main>;
  if (error) return <main className="container-base">오류: {error}</main>;
  if (!payload) return <main className="container-base">예매 후 티켓이 발급됩니다.</main>;

  const statusDone = payload.booking.status === "CONFIRMED";
  const title = payload.booking.event?.title || CURRENT_SHOW_INFO.title;
  const createdAt = new Date(payload.booking.createdAt).toLocaleString("ko-KR");

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">내 티켓</h1>

      {!statusDone && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="font-semibold text-amber-800">예약 대기 상태 (입금 확인 전)</p>
          <p className="text-sm text-amber-900">
            {CURRENT_SHOW_INFO.payment.holder} : {CURRENT_SHOW_INFO.payment.bank} {CURRENT_SHOW_INFO.payment.account}
          </p>
          <p className="text-sm text-amber-900">입금 금액: {CURRENT_SHOW_INFO.payment.amount.toLocaleString()}원</p>
          <p className="text-sm text-amber-800">입금 후 관리자 승인 시 티켓이 확정되고 QR 입장이 활성화됩니다.</p>
        </section>
      )}

      <div className="grid gap-3">
        {tickets.map((ticket, index) => (
          <section
            key={ticket.id}
            onClick={() => {
              if (statusDone && ticket.ticketCode) setSelectedQr(ticket.ticketCode);
            }}
            className={`rounded-xl border p-4 space-y-2 ${
              statusDone ? "cursor-pointer border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">내 티켓</span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  statusDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {statusDone ? "예약 완료" : "예약 대기"}
              </span>
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-slate-600">구매시간: {createdAt}</p>
            <p className="text-sm text-slate-600">티켓 {index + 1}</p>
            {statusDone && ticket.ticketCode && <p className="text-sm text-slate-700">티켓 클릭 시 QR 표시</p>}
            {ticket.checkedInAt && (
              <p className="text-sm font-semibold text-emerald-700">
                입장 완료: {new Date(ticket.checkedInAt).toLocaleString("ko-KR")}
              </p>
            )}
          </section>
        ))}
      </div>

      {selectedQr && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSelectedQr(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setSelectedQr(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3 text-center"
          >
            <h3 className="text-lg font-semibold">입장 QR</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selectedQr)}`}
              alt="입장 QR 코드"
              className="mx-auto rounded border"
            />
            <p className="text-xs break-all text-slate-500">{selectedQr}</p>
            <button
              type="button"
              onClick={() => setSelectedQr(null)}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
