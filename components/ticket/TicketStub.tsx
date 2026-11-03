import { bookingNumber, formatDateTime } from "@/lib/format";
import { reservationStatus } from "@/lib/status";
import { LockIcon } from "../icons";

type Props = {
  show: { title: string; dateLabel: string; timeLabel: string; venue: string };
  booking: { id: string; status: string; createdAt: string };
  checkedInAt: string | null;
  qrImage: string;
  children?: React.ReactNode;
};

// 마이 티켓의 모바일 티켓. 진홍 머리, 절취선, QR. 입장하면 도장이 찍힌다.
export default function TicketStub({ show, booking, checkedInAt, qrImage, children }: Props) {
  const status = checkedInAt ? { label: "입장 완료" } : reservationStatus(booking.status);
  const live = booking.status === "CONFIRMED" || booking.status === "PAYMENT_PENDING";

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_30px_rgba(74,7,11,0.10)]">
      <header className={`px-6 pb-7 pt-5 text-white ${live ? "bg-brand-600" : "bg-ink-2"}`}>
        <div className="flex items-center justify-between text-meta">
          <span className="text-white/80">모바일 티켓</span>
          <span className="rounded bg-white/15 px-2 py-0.5 font-semibold">{status.label}</span>
        </div>
        <h2 className="mt-5 text-h2 font-bold">{show.title}</h2>
        <p className="mt-2 text-ui text-white/90">
          {show.dateLabel} {show.timeLabel}
        </p>
        <p className="text-ui text-white/90">{show.venue}</p>
      </header>

      {/* 절취선: 양옆 반원 홈 + 점선 */}
      <div className="relative h-6" aria-hidden>
        <span className="absolute -left-3 top-0 h-6 w-6 rounded-full border border-line bg-surface" />
        <span className="absolute -right-3 top-0 h-6 w-6 rounded-full border border-line bg-surface" />
        <span className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-line-strong" />
      </div>

      <div className="px-6 pb-6 pt-3">
        {booking.status === "CONFIRMED" && (
          <div className="relative mx-auto flex w-fit flex-col items-center">
            {qrImage ? (
              <img
                src={qrImage}
                alt="입장 QR 코드"
                width={200}
                height={200}
                className={`h-[200px] w-[200px] ${checkedInAt ? "opacity-[0.15]" : ""}`}
              />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded bg-surface" />
            )}
            {checkedInAt && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-36 w-36 -rotate-12 flex-col items-center justify-center rounded-full border-[3px] border-brand-600 text-brand-600">
                  <span className="text-h2 font-extrabold tracking-[-0.04em]">입장 완료</span>
                  <span className="mt-1 text-cap font-semibold">{formatDateTime(checkedInAt)}</span>
                </div>
              </div>
            )}
            <p className="mt-3 text-ui font-semibold text-ink">
              {checkedInAt ? "입장 처리된 티켓이에요" : "입장할 때 이 QR을 보여 주세요"}
            </p>
            {!checkedInAt && <p className="mt-1 text-cap text-ink-3">QR이 안 찍히면 이름이나 아래 예매번호를 알려 주세요.</p>}
          </div>
        )}

        {booking.status === "PAYMENT_PENDING" && (
          <div className="mx-auto flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong text-center text-ink-3">
            <LockIcon />
            <p className="px-4 text-meta">입금이 확인되면 QR 티켓이 열려요</p>
          </div>
        )}

        {children}

        <dl className="mt-6 space-y-1.5 border-t border-line pt-4 text-meta">
          <div className="flex justify-between">
            <dt className="text-ink-3">예매번호</dt>
            <dd className="font-semibold tabular-nums tracking-wide">{bookingNumber(booking.id)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">예매일시</dt>
            <dd className="tabular-nums">{formatDateTime(booking.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">매수</dt>
            <dd>1매</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
