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
  const [selectedRefundTicketId, setSelectedRefundTicketId] = useState("");

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
      setError(loadError instanceof Error ? loadError.message : "Failed to load booking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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

  const usedTickets = useMemo(() => tickets.filter((t) => !!t.checkedInAt), [tickets]);
  const activeTickets = useMemo(() => tickets.filter((t) => !t.checkedInAt), [tickets]);

  const status = payload?.booking.status;
  const isConfirmed = status === "CONFIRMED";

  useEffect(() => {
    if (!isConfirmed) {
      setSelectedRefundTicketId("");
      return;
    }
    const stillValid = activeTickets.some((t) => t.id === selectedRefundTicketId);
    if (stillValid) return;
    if (activeTickets.length > 0) {
      setSelectedRefundTicketId(activeTickets[0].id);
    } else {
      setSelectedRefundTicketId("");
    }
  }, [isConfirmed, selectedRefundTicketId, activeTickets]);

  const cancelPendingBooking = async () => {
    if (!payload) return;
    setMessage("");
    try {
      await springFetch(`/bookings/${payload.booking.id}/cancel`, { method: "POST" });
      setMessage("Booking has been cancelled and seats were restored.");
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to cancel booking.");
    }
  };

  const requestRefundByTicket = async (ticket: Ticket) => {
    if (!payload) return;
    if (ticket.checkedInAt) {
      setMessage("Used ticket cannot be refunded.");
      return;
    }

    const reservationId = ticket.booking?.id || payload.booking.id;
    if (!reservationId) return;

    setMessage("");
    try {
      await springFetch("/refunds/request", {
        method: "POST",
        bodyJson: { reservationId },
      });
      setMessage(`Refund set to pending. Please contact ${CURRENT_SHOW_INFO.refundContact}.`);
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to request refund.");
    }
  };

  if (loading) return <main className="container-base">Loading...</main>;
  if (error) return <main className="container-base">Error: {error}</main>;
  if (!payload) return <main className="container-base">No ticket found.</main>;

  const title = payload.booking.event?.title || CURRENT_SHOW_INFO.title;
  const createdAt = new Date(payload.booking.createdAt).toLocaleString("ko-KR");
  const selectedRefundTicket = activeTickets.find((t) => t.id === selectedRefundTicketId) || null;

  const statusTextMap: Record<string, string> = {
    PAYMENT_PENDING: "Payment Pending",
    CONFIRMED: "Confirmed",
    REFUND_PENDING: "Refund Pending",
    REFUNDED: "Refunded",
    CANCELLED: "Cancelled",
  };
  const statusText = statusTextMap[status || ""] || status || "-";

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">My Ticket</h1>

      {status === "PAYMENT_PENDING" && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="font-semibold text-amber-800">Payment pending</p>
          <p className="text-sm text-amber-900">
            {CURRENT_SHOW_INFO.payment.holder} : {CURRENT_SHOW_INFO.payment.bank} {CURRENT_SHOW_INFO.payment.account}
          </p>
          <p className="text-sm text-amber-900">Amount: {CURRENT_SHOW_INFO.payment.amount.toLocaleString()} KRW</p>
          <button
            type="button"
            onClick={() => void cancelPendingBooking()}
            className="rounded bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Cancel booking
          </button>
        </section>
      )}

      {status === "CONFIRMED" && (
        <section className="rounded-xl border border-sky-300 bg-sky-50 p-4 space-y-2">
          <p className="font-semibold text-sky-800">Booking confirmed</p>
          <p className="text-sm text-sky-900">Choose one active ticket below, then request refund.</p>
          {activeTickets.length === 0 && <p className="text-sm text-rose-700">No refundable ticket left.</p>}
          <p className="text-sm text-sky-900">Selected ticket: {selectedRefundTicket ? selectedRefundTicket.id : "None"}</p>
          <button
            type="button"
            disabled={!selectedRefundTicket}
            onClick={() => {
              if (!selectedRefundTicket) return;
              void requestRefundByTicket(selectedRefundTicket);
            }}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request refund for selected ticket
          </button>
        </section>
      )}

      {status === "REFUND_PENDING" && (
        <section className="rounded-xl border border-violet-300 bg-violet-50 p-4">
          <p className="text-sm text-violet-900">Refund is pending. Please contact {CURRENT_SHOW_INFO.refundContact}.</p>
        </section>
      )}

      {message && <p className="text-sm text-slate-700">{message}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Active Tickets</h2>
        <div className="grid gap-3">
          {activeTickets.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No active ticket.</div>
          )}

          {activeTickets.map((ticket, index) => (
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
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Ticket</span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{statusText}</span>
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-slate-600">Purchased at: {createdAt}</p>
              <p className="text-sm text-slate-600">Ticket #{index + 1}</p>
              {isConfirmed && ticket.ticketCode && <p className="text-sm text-slate-700">Click card to open QR</p>}

              {isConfirmed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRefundTicketId(ticket.id);
                  }}
                  className={`mt-1 rounded px-3 py-1 text-xs font-semibold ${
                    selectedRefundTicketId === ticket.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {selectedRefundTicketId === ticket.id ? "Selected for refund" : "Select this for refund"}
                </button>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Used Tickets</h2>
        <div className="grid gap-3">
          {usedTickets.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No used ticket.</div>
          )}

          {usedTickets.map((ticket, index) => (
            <section key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Ticket</span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Used</span>
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-slate-600">Purchased at: {createdAt}</p>
              <p className="text-sm text-slate-600">Used ticket #{index + 1}</p>
              <p className="text-sm font-semibold text-emerald-700">
                Checked in: {new Date(ticket.checkedInAt as string).toLocaleString("ko-KR")}
              </p>
              <p className="text-xs text-slate-500">Used tickets are not refundable.</p>
            </section>
          ))}
        </div>
      </section>

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
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl space-y-3">
            <h3 className="text-lg font-semibold">Entry QR</h3>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selectedQr)}`}
              alt="Entry QR code"
              className="mx-auto rounded border"
            />
            <p className="text-xs break-all text-slate-500">{selectedQr}</p>
            <button
              type="button"
              onClick={() => setSelectedQr(null)}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
