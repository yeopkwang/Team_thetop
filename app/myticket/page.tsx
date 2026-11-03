"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import EmptyState from "@/components/EmptyState";
import { CheckIcon, CopyIcon } from "@/components/icons";
import TicketStub from "@/components/ticket/TicketStub";
import { ApiError, apiFetch, getToken } from "@/lib/api-client";
import { won } from "@/lib/format";

type Booking = { id: string; status: string; createdAt: string; quantity: number };
type Ticket = { id: string; ticketCode: string; checkedInAt?: string | null };
type ShowSummary = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  price: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
  refundContact: string;
};
type Dashboard = { booking: Booking | null; tickets: Ticket[]; show: ShowSummary | null };

type View = "loading" | "login" | "error" | "ready";

const CLOSED_MESSAGES: Record<string, string> = {
  CANCELLED: "예매를 취소했어요. 좌석이 남아 있으면 다시 예매할 수 있어요.",
  REFUNDED: "환불이 끝났어요. 좌석이 남아 있으면 다시 예매할 수 있어요.",
  EXPIRED: "입금 기한이 지나 예매가 만료됐어요.",
};

function PaymentGuide({ show }: { show: ShowSummary }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(show.paymentAccount.replace(/[^0-9]/g, "") || show.paymentAccount);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-xl border border-wait-700/20 bg-wait-50 p-5">
      <h2 className="text-[15px] font-bold text-wait-700">입금하면 예매가 완료돼요</h2>
      <dl className="mt-3 space-y-2 text-ui">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-2">입금 계좌</dt>
          <dd className="flex items-center gap-2 text-right font-semibold">
            <span>
              {show.paymentBank} {show.paymentAccount}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1 rounded border border-line-strong bg-white px-2 text-cap font-semibold text-ink-2 hover:text-ink"
            >
              {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              {copied ? "복사됨" : "복사"}
            </button>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">예금주</dt>
          <dd>{show.paymentHolder}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">입금 금액</dt>
          <dd className="text-lead font-bold text-ink">{won(show.price)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-meta text-ink-2">입금자명은 관람객 본인의 실명으로 해 주세요.</p>
    </section>
  );
}

export default function MyTicketPage() {
  const [view, setView] = useState<View>("loading");
  const [data, setData] = useState<Dashboard | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
      setMessage(error instanceof Error ? error.message : "티켓을 불러오지 못했어요.");
      setView("error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const ticket = data?.tickets[0] || null;

  // QR은 브라우저에서 그린다. 외부 QR 서비스에 넘기면 입장 토큰이 남의 서버에 남는다.
  useEffect(() => {
    if (!ticket?.ticketCode) {
      setQrImage("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(ticket.ticketCode, { width: 400, margin: 1 })
      .then((url) => !cancelled && setQrImage(url))
      .catch(() => !cancelled && setMessage("QR 코드를 그리지 못했어요. 새로고침해 주세요."));
    return () => {
      cancelled = true;
    };
  }, [ticket?.ticketCode]);

  const act = async (confirmText: string, path: string, body: Record<string, unknown> | undefined, done: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(path, { method: "POST", bodyJson: body ?? {} });
      setMessage(done);
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했어요.");
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
        <Link href="/login" className="btn-primary">
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
    const { booking, show } = data;
    const closed = CLOSED_MESSAGES[booking.status];

    body = (
      <div className="mx-auto max-w-[400px] space-y-4">
        {booking.status === "PAYMENT_PENDING" && <PaymentGuide show={show} />}

        <TicketStub
          show={show}
          booking={booking}
          ticketCode={ticket?.ticketCode || ""}
          checkedInAt={ticket?.checkedInAt || null}
          qrImage={qrImage}
        >
          {booking.status === "REFUND_PENDING" && (
            <p className="text-center text-ui text-ink-2">
              환불을 요청했어요.{" "}
              {show.refundContact ? (
                <>
                  <strong className="font-semibold text-ink">{show.refundContact}</strong>로 카카오톡을 보내 주시면 환불해 드려요.
                </>
              ) : (
                "공연 문의처로 연락해 주세요."
              )}
            </p>
          )}
          {closed && (
            <div className="text-center">
              <p className="text-ui text-ink-2">{closed}</p>
              {booking.status !== "EXPIRED" && (
                <Link href="/book" className="btn-primary mt-4">
                  다시 예매하기
                </Link>
              )}
            </div>
          )}
        </TicketStub>

        {booking.status === "PAYMENT_PENDING" && (
          <div className="text-center">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act("예매를 취소할까요? 좌석이 다른 분께 돌아가요.", `/bookings/${booking.id}/cancel`, undefined, "예매를 취소했어요.")
              }
              className="btn-ghost text-meta"
            >
              예매 취소
            </button>
          </div>
        )}
        {booking.status === "CONFIRMED" && !ticket?.checkedInAt && (
          <div className="text-center">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(
                  "환불을 요청할까요? 요청하면 이 티켓으로 입장할 수 없어요.",
                  "/refunds/request",
                  { reservationId: booking.id },
                  "환불을 요청했어요."
                )
              }
              className="btn-ghost text-meta"
            >
              환불 요청
            </button>
          </div>
        )}
        {message && (
          <p role="status" className="text-center text-meta text-ink-2">
            {message}
          </p>
        )}
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
