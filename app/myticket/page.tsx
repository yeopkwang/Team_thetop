"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import EmptyState from "@/components/EmptyState";
import PaymentGuide from "@/components/ticket/PaymentGuide";
import RefundRequestForm from "@/components/ticket/RefundRequestForm";
import TicketStub from "@/components/ticket/TicketStub";
import VisitGuide from "@/components/ticket/VisitGuide";
import { ApiError, apiFetch, errorMessage, getToken } from "@/lib/api-client";

type Booking = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  depositorName: string;
  cancelReason: string;
  startsAt: string;
};
type Ticket = { code: string; checkedInAt: string | null };
type Refund = { bank: string; account: string; holder: string };
type ShowSummary = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  timeSubLabel: string;
  venue: string;
  venueAddress: string;
  contactName: string;
  contactTag: string;
  price: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
  refundContact: string;
};
type Dashboard = { booking: Booking | null; ticket: Ticket | null; show: ShowSummary | null; refund: Refund | null };

type View = "loading" | "login" | "error" | "ready";

const CLOSED_MESSAGES: Record<string, string> = {
  CANCELLED: "예매를 취소했어요. 좌석이 남아 있으면 다시 예매할 수 있어요.",
  REFUNDED: "환불이 끝났어요. 좌석이 남아 있으면 다시 예매할 수 있어요.",
  EXPIRED: "입금 기한이 지나 예매가 만료됐어요. 이미 입금했다면 공연 문의처로 알려 주세요. 좌석이 남아 있으면 다시 예매할 수도 있어요.",
};

export default function MyTicketPage() {
  const [view, setView] = useState<View>("loading");
  const [data, setData] = useState<Dashboard | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [justBooked, setJustBooked] = useState(false);

  const load = async () => {
    if (!getToken()) {
      setView("login");
      return;
    }
    try {
      setData(await apiFetch<Dashboard>("/my/ticket-dashboard"));
      setView("ready");
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        setView("login");
        return;
      }
      setMessage(errorMessage(error, "티켓을 불러오지 못했어요."));
      setView("error");
    }
  };

  useEffect(() => {
    // 예매 화면에서 막 넘어왔으면 접수 안내를 한 번 보여 주고 주소는 깨끗하게 둔다.
    if (new URLSearchParams(window.location.search).get("booked") === "1") {
      setJustBooked(true);
      window.history.replaceState(null, "", "/myticket");
    }
    void load();
  }, []);

  const ticket = data?.ticket || null;

  // QR은 브라우저에서 그린다. 외부 QR 서비스에 넘기면 입장 토큰이 남의 서버에 남는다.
  useEffect(() => {
    if (!ticket?.code) {
      setQrImage("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(ticket.code, { width: 400, margin: 1 })
      .then((url) => !cancelled && setQrImage(url))
      .catch(() => !cancelled && setMessage("QR 코드를 그리지 못했어요. 새로고침해 주세요."));
    return () => {
      cancelled = true;
    };
  }, [ticket?.code]);

  const cancelBooking = async (bookingId: string) => {
    if (!window.confirm("예매를 취소할까요? 좌석이 다른 분께 돌아가요.")) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(`/bookings/${bookingId}/cancel`, { method: "POST", bodyJson: {} });
      setMessage("예매를 취소했어요.");
      await load();
    } catch (error: unknown) {
      setMessage(errorMessage(error, "취소하지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  let body: React.ReactNode = null;

  if (view === "loading") {
    body = (
      <div aria-busy="true" aria-label="불러오는 중" className="mx-auto max-w-[400px] overflow-hidden rounded-2xl border border-line bg-white">
        <div className="h-[150px] bg-brand-600/15" />
        <div className="flex flex-col items-center gap-3 px-6 py-7">
          <div className="bone h-[200px] w-[200px]" />
          <div className="bone h-4 w-40" />
          <div className="bone mt-4 h-20 w-full" />
        </div>
      </div>
    );
  } else if (view === "login") {
    body = (
      <EmptyState title="로그인하면 예매한 티켓을 볼 수 있어요" description="예매할 때 쓴 카카오 계정으로 로그인해 주세요.">
        <Link href="/login?next=/myticket" className="btn-primary">
          로그인하기
        </Link>
      </EmptyState>
    );
  } else if (view === "error") {
    body = (
      <EmptyState title="티켓을 불러오지 못했어요" description={message}>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          다시 불러오기
        </button>
      </EmptyState>
    );
  } else if (!data?.show) {
    body = <EmptyState title="지금 예매 중인 공연이 없어요" description="다음 공연 예매가 열리면 이곳에서 티켓을 볼 수 있어요." />;
  } else if (!data.booking) {
    body = (
      <EmptyState title="아직 예매한 티켓이 없어요" description={`${data.show.title} 예매는 1인 1매예요.`}>
        <Link href="/book" className="btn-primary">
          예매하러 가기
        </Link>
      </EmptyState>
    );
  } else {
    const { booking, show, refund } = data;
    // 운영진이 취소한 예매는 사유를 함께 보여 준다.
    const closed =
      booking.status === "CANCELLED" && booking.cancelReason
        ? `운영진이 예매를 취소했어요. 사유: ${booking.cancelReason}`
        : CLOSED_MESSAGES[booking.status];
    const live = booking.status === "PAYMENT_PENDING" || booking.status === "CONFIRMED";

    body = (
      <div className="mx-auto max-w-[400px] space-y-4">
        {justBooked && booking.status === "PAYMENT_PENDING" && (
          <p role="status" className="rounded-xl bg-ok-50 px-5 py-4 text-ui font-semibold text-ok-600">
            예매가 접수됐어요. 아래 계좌로 입금하면 예매가 완료돼요.
          </p>
        )}
        {booking.status === "PAYMENT_PENDING" && <PaymentGuide show={show} booking={booking} onChanged={load} />}

        <TicketStub show={show} booking={booking} checkedInAt={ticket?.checkedInAt || null} qrImage={qrImage}>
          {booking.status === "REFUND_PENDING" && (
            <div className="space-y-1 text-center text-ui text-ink-2">
              <p>환불을 요청했어요. 운영진이 송금하면 환불 완료로 바뀌어요.</p>
              {refund?.account && (
                <p className="text-meta">
                  받을 계좌: {refund.bank} {refund.account} ({refund.holder})
                </p>
              )}
              {show.refundContact && <p className="text-meta">문의: {show.refundContact}</p>}
            </div>
          )}
          {closed && (
            <div className="text-center">
              <p className="text-ui text-ink-2">{closed}</p>
              <Link href="/book" className="btn-primary mt-4">
                다시 예매하기
              </Link>
            </div>
          )}
        </TicketStub>

        {booking.status === "PAYMENT_PENDING" && (
          <div className="text-center">
            <button type="button" disabled={busy} onClick={() => void cancelBooking(booking.id)} className="btn-ghost text-meta">
              예매 취소
            </button>
          </div>
        )}
        {booking.status === "CONFIRMED" &&
          !ticket?.checkedInAt &&
          (refundOpen ? (
            <RefundRequestForm
              bookingId={booking.id}
              defaultHolder={booking.depositorName}
              onCancel={() => setRefundOpen(false)}
              onDone={async (done) => {
                setRefundOpen(false);
                setMessage(done);
                await load();
              }}
            />
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setRefundOpen(true);
                  setMessage("");
                }}
                className="btn-ghost text-meta"
              >
                환불 요청
              </button>
            </div>
          ))}
        {message && (
          <p role="status" className="text-center text-meta text-ink-2">
            {message}
          </p>
        )}

        {live && <VisitGuide show={show} startsAt={booking.startsAt} appUrl={window.location.origin} />}

        <p className="text-center text-meta text-ink-3">
          입금·환불·입장이 궁금하면{" "}
          <Link href="/help" className="font-semibold text-ink-2 underline underline-offset-2">
            자주 묻는 질문
          </Link>
          을 봐 주세요.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-full bg-surface pb-16">
      <div className="page pt-6 lg:pt-10">
        <h1 className="mx-auto mb-6 max-w-[400px] text-h1 font-bold">마이 티켓</h1>
        <div key={view} className={view === "loading" ? "" : "page-enter"}>
          {body}
        </div>
      </div>
    </main>
  );
}
