import CalendarLinks from "@/components/CalendarLinks";
import { showEvent } from "@/lib/calendar";
import { mapLinks } from "@/lib/maps";

type Props = {
  show: {
    id: string;
    title: string;
    dateLabel: string;
    timeLabel: string;
    timeSubLabel: string;
    venue: string;
    venueAddress: string;
    contactName: string;
    contactTag: string;
  };
  startsAt: string;
  appUrl: string;
};

// 마이 티켓 아래 '공연 당일 안내': 일시, 장소와 지도, 입장 방법, 문의, 캘린더에 추가.
export default function VisitGuide({ show, startsAt, appUrl }: Props) {
  const place = show.venueAddress || show.venue;
  const contact = [show.contactName, show.contactTag].filter(Boolean).join(" ");
  const event = showEvent({ ...show, startsAt: new Date(startsAt) }, appUrl);

  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-bold">공연 당일 안내</h2>
      <dl className="mt-3 space-y-2 text-ui">
        <div className="flex gap-4">
          <dt className="w-14 shrink-0 text-ink-3">일시</dt>
          <dd>
            {show.dateLabel} {show.timeLabel}
            {show.timeSubLabel && <span className="block text-meta text-ink-3">{show.timeSubLabel}</span>}
          </dd>
        </div>
        {show.venue && (
          <div className="flex gap-4">
            <dt className="w-14 shrink-0 text-ink-3">장소</dt>
            <dd>
              {show.venue}
              {show.venueAddress && <span className="block text-meta text-ink-3">{show.venueAddress}</span>}
              <span className="mt-1.5 flex gap-3 text-meta font-semibold">
                {mapLinks(place).map((m) => (
                  <a key={m.name} href={m.href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {m.name}
                  </a>
                ))}
              </span>
            </dd>
          </div>
        )}
        <div className="flex gap-4">
          <dt className="w-14 shrink-0 text-ink-3">입장</dt>
          <dd>마이 티켓의 QR을 보여 주세요. 화면 밝기를 올려 두면 빨리 찍혀요.</dd>
        </div>
        {contact && (
          <div className="flex gap-4">
            <dt className="w-14 shrink-0 text-ink-3">문의</dt>
            <dd>{contact}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 border-t border-line pt-4">
        <CalendarLinks icsHref="/api/calendar?type=show" event={event} label="캘린더에 공연 추가" />
      </div>
    </section>
  );
}
