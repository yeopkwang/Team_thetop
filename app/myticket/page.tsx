"use client";

import { useEffect, useMemo, useState } from "react";
import { springFetch } from "@/lib/spring-client";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

type BookingStatus =
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "CANCELLED"
  | string;

type Booking = {
  id: string;
  status: BookingStatus;
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
  const [message, setMessage] = useState("");
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

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
      setPayload({ booking: latest, tickets: related });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "티켓 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const cancelPendingBooking = async () => {
    if (!payload) return;
    setMessage("");
    try {
      await springFetch(`/bookings/${payload.booking.id}/cancel`, { method: "POST" });
      setMessage("예매가 취소되었습니다. 좌석이 복구되었습니다.");
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "취소 처리에 실패했습니다.");
    }
  };

  const requestRefund = async () => {
    if (!payload) return;
    setMessage("");
    try {
      await springFetch("/refunds/request", {
        method: "POST",
        bodyJson: { reservationId: payload.booking.id },
      });
      setMessage(
        `환불 대기 상태로 전환되었습니다. ${CURRENT_SHOW_INFO.refundContact} 번호로 카카오톡 보내주세요.`
      );
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "환불 요청에 실패했습니다.");
    }
  };

  if (loading) return <main className="container-base">불러오는 중...</main>;
  if (error) return <main className="container-base">오류: {error}</main>;
  if (!payload) return <main className="container-base">예매 후 티켓이 발급됩니다.</main>;

  const status = payload.booking.status;
  const isConfirmed = status === "CONFIRMED";
  const title = payload.booking.event?.title || CURRENT_SHOW_INFO.title;
  const createdAt = new Date(payload.booking.createdAt).toLocaleString("ko-KR");

  const statusTextMap: Record<string, string> = {
    PAYMENT_PENDING: "예약 대기",
    CONFIRMED: "예약 완료",
    REFUND_PENDING: "환불 대기",
    REFUNDED: "환불 완료",
    CANCELLED: "예약 취소",
  };
  const statusText = statusTextMap[status] || status;

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">내 티켓</h1>

      {status === "PAYMENT_PENDING" && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="font-semibold text-amber-800">예약 대기 상태 (입금 확인 전)</p>
          <p className="text-sm text-amber-900">
            {CURRENT_SHOW_INFO.payment.holder} : {CURRENT_SHOW_INFO.payment.bank} {CURRENT_SHOW_INFO.payment.account}
          </p>
          <p className="text-sm text-amber-900">입금 금액: {CURRENT_SHOW_INFO.payment.amount.toLocaleString()}원</p>
          <button
            type="button"
            onClick={cancelPendingBooking}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            취소하기
          </button>
        </section>
      )}

      {status === "CONFIRMED" && (
        <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 space-y-2">
          <p className="font-semibold text-sky-800">예약 완료 상태입니다.</p>
          <p className="text-sm text-sky-900">
            환불을 원하면 {CURRENT_SHOW_INFO.refundContact} 번호로 카카오톡 보내주세요.
          </p>
          <button
            type="button"
            onClick={requestRefund}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            환불 요청(환불 대기 전환)
          </button>
        </section>
      )}

      {status === "REFUND_PENDING" && (
        <section className="rounded-xl border border-violet-300 bg-violet-50 p-4">
          <p className="text-sm text-violet-900">
            환불 대기 상태입니다. {CURRENT_SHOW_INFO.refundContact} 번호로 카카오톡 보내주세요.
          </p>
        </section>
      )}

      {message && <p className="text-sm text-slate-700">{message}</p>}

      <div className="grid gap-3">
        {tickets.map((ticket, index) => (
          <section
            key={ticket.id}
            onClick={() => {
              if (isConfirmed && ticket.ticketCode) setSelectedQr(ticket.ticketCode);
            }}
            className={`rounded-xl border p-4 space-y-2 ${
              isConfirmed ? "cursor-pointer border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">내 티켓</span>
              <span className="rounded-full px-2 py-1 text-xs font-semibold bg-slate-200 text-slate-700">{statusText}</span>
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-slate-600">구매시간: {createdAt}</p>
            <p className="text-sm text-slate-600">티켓 {index + 1}</p>
            {isConfirmed && ticket.ticketCode && <p className="text-sm text-slate-700">티켓 클릭 시 QR 표시</p>}
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
