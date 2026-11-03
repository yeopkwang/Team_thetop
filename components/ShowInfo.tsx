import type { Show } from "@prisma/client";

type ShowInfoFields = Pick<
  Show,
  | "title"
  | "posterUrl"
  | "dateLabel"
  | "timeLabel"
  | "timeSubLabel"
  | "venue"
  | "venueAddress"
  | "contactName"
  | "contactTag"
  | "paymentBank"
  | "paymentAccount"
  | "paymentHolder"
  | "audienceInfo"
  | "notice"
>;

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[88px_1fr] gap-2 ${last ? "" : "border-b pb-2"}`}>
      <div className="text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}

// 홈과 예매 화면 위쪽의 공연 정보 카드.
export default function ShowInfo({ show, children }: { show: ShowInfoFields; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow md:p-8">
      <p className="text-sm font-semibold text-red-700">현재 예매 가능한 공연</p>
      <h1 className="mt-2 text-3xl font-bold">{show.title}</h1>

      <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
        {show.posterUrl && (
          <div className="rounded-xl border bg-slate-50 p-3">
            <img src={show.posterUrl} alt="공연 포스터" className="w-full rounded-lg object-cover" />
          </div>
        )}

        <div className="space-y-3">
          <Row label="일시">{show.dateLabel}</Row>
          <Row label="시간">
            <div>{show.timeLabel}</div>
            <div className="text-sm text-slate-500">{show.timeSubLabel}</div>
          </Row>
          <Row label="장소">
            <div>{show.venue}</div>
            <div className="text-sm text-slate-500">{show.venueAddress}</div>
          </Row>
          <Row label="문의">
            <div>{show.contactName}</div>
            <div className="text-sm text-slate-500">{show.contactTag}</div>
          </Row>
          <Row label="입금 계좌">
            <span className="font-semibold">
              {show.paymentBank} {show.paymentAccount} ({show.paymentHolder})
            </span>
          </Row>
          <Row label="입장 관련" last>
            {show.audienceInfo}
          </Row>

          <p className="pt-2 text-sm text-slate-600">{show.notice}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
